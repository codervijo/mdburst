/**
 * Markdown -> DOCX (Office Open XML).
 *
 * The point of this converter is *structure*: a heading must become a real
 * Word heading (navigable in the sidebar, restylable, exported to a PDF
 * outline), a table must become a real table, a list must carry real
 * numbering. Dumping markdown source into a paragraph would be trivial and
 * useless.
 *
 * Approach: `marked.lexer()` gives a nested token tree; we walk it and emit
 * `docx` elements. Everything here is pure — no DOM, no Blob — so it runs
 * unchanged in vitest under Node. The browser-only packaging step lives in
 * `markdownToDocxBlob`.
 */

import { marked, type Token, type Tokens } from "marked";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from "docx";

/** Numbering definition id referenced by ordered-list paragraphs. */
const ORDERED_REF = "md-ordered";

const MONO_FONT = "Consolas";
const CODE_SHADING = { type: ShadingType.CLEAR, color: "auto", fill: "F1F3F5" };
const RULE_COLOR = "CED4DA";

/** Twips of indent added per blockquote nesting level. */
const QUOTE_INDENT = 480;

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
] as const;

/** Formatting carried down from ancestor inline tokens. */
interface InlineStyle {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  /** Applies Word's built-in Hyperlink character style to descendant runs. */
  hyperlink?: boolean;
}

/** Block-level context inherited from enclosing blockquotes. */
interface BlockContext {
  quoteDepth: number;
}

export interface DocxStats {
  headings: number;
  paragraphs: number;
  lists: number;
  listItems: number;
  tables: number;
  codeBlocks: number;
  blockquotes: number;
  links: number;
  horizontalRules: number;
  images: number;
}

export interface DocxConversionResult {
  doc: Document;
  /** Counts used for analytics and the "what we converted" summary in the UI. */
  stats: DocxStats;
}

function emptyStats(): DocxStats {
  return {
    headings: 0,
    paragraphs: 0,
    lists: 0,
    listItems: 0,
    tables: 0,
    codeBlocks: 0,
    blockquotes: 0,
    links: 0,
    horizontalRules: 0,
    images: 0,
  };
}

export class MarkdownConversionError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "MarkdownConversionError";
    this.code = code;
  }
}

/* ------------------------------------------------------------------ inline */

/** Build a run, folding the accumulated inline style into docx options. */
function run(text: string, style: InlineStyle, extra: Record<string, unknown> = {}) {
  const { hyperlink, ...marks } = style;
  return new TextRun({
    text,
    ...marks,
    ...(hyperlink ? { style: "Hyperlink" } : {}),
    ...extra,
  });
}

/**
 * Convert inline tokens (bold, links, code spans...) into docx runs.
 * `style` accumulates as we descend, so `**bold _and italic_**` yields a run
 * with both flags rather than losing the outer one.
 */
function inlineTokens(
  tokens: Token[] | undefined,
  style: InlineStyle,
  stats: DocxStats,
): ParagraphChild[] {
  if (!tokens) return [];
  const out: ParagraphChild[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "text": {
        const t = token as Tokens.Text;
        // GFM wraps some text nodes in child tokens (e.g. autolinks); prefer them.
        if (t.tokens?.length) {
          out.push(...inlineTokens(t.tokens, style, stats));
        } else {
          out.push(run(decodeEntities(t.text), style));
        }
        break;
      }

      case "strong":
        out.push(
          ...inlineTokens((token as Tokens.Strong).tokens, { ...style, bold: true }, stats),
        );
        break;

      case "em":
        out.push(
          ...inlineTokens((token as Tokens.Em).tokens, { ...style, italics: true }, stats),
        );
        break;

      case "del":
        out.push(
          ...inlineTokens((token as Tokens.Del).tokens, { ...style, strike: true }, stats),
        );
        break;

      case "codespan":
        out.push(
          run(decodeEntities((token as Tokens.Codespan).text), style, {
            font: MONO_FONT,
            shading: CODE_SHADING,
          }),
        );
        break;

      case "link": {
        const link = token as Tokens.Link;
        stats.links += 1;
        const linkStyle: InlineStyle = { ...style, hyperlink: true };
        const children = inlineTokens(link.tokens, linkStyle, stats);
        out.push(
          new ExternalHyperlink({
            link: link.href,
            children: children.length ? children : [run(link.href, linkStyle)],
          }),
        );
        break;
      }

      case "image": {
        const image = token as Tokens.Image;
        stats.images += 1;
        // Remote image bytes can't be fetched during a purely local conversion,
        // so the alt text survives as an italic placeholder rather than the
        // reference being silently dropped. Stated in the page limitations.
        out.push(run(`[image: ${image.text || image.href}]`, { ...style, italics: true }));
        break;
      }

      case "br":
        out.push(new TextRun({ text: "", break: 1 }));
        break;

      case "escape":
        out.push(run((token as Tokens.Escape).text, style));
        break;

      case "html":
        // Inline HTML has no DOCX equivalent; keep the visible text only.
        out.push(run(stripTags((token as Tokens.HTML).text), style));
        break;

      default: {
        const anyToken = token as { tokens?: Token[]; text?: string };
        if (anyToken.tokens?.length) {
          out.push(...inlineTokens(anyToken.tokens, style, stats));
        } else if (anyToken.text) {
          out.push(run(decodeEntities(anyToken.text), style));
        }
      }
    }
  }

  return out;
}

/** marked leaves HTML entities encoded in `.text`; Word wants the characters. */
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/* ------------------------------------------------------------------- block */

/** Indent + left rule applied to paragraphs inside a blockquote. */
function quoteDecoration(ctx: BlockContext) {
  if (ctx.quoteDepth === 0) return {};
  return {
    indent: { left: QUOTE_INDENT * ctx.quoteDepth },
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, space: 12, color: RULE_COLOR },
    },
  };
}

function blockTokens(
  tokens: Token[],
  stats: DocxStats,
  ctx: BlockContext = { quoteDepth: 0 },
): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  const quoted = quoteDecoration(ctx);

  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const heading = token as Tokens.Heading;
        stats.headings += 1;
        const depth = Math.min(Math.max(heading.depth, 1), 6);
        out.push(
          new Paragraph({
            heading: HEADING_LEVELS[depth - 1],
            children: inlineTokens(heading.tokens, {}, stats),
            spacing: { before: 240, after: 120 },
            ...quoted,
          }),
        );
        break;
      }

      case "paragraph": {
        const para = token as Tokens.Paragraph;
        stats.paragraphs += 1;
        out.push(
          new Paragraph({
            children: inlineTokens(para.tokens, ctx.quoteDepth > 0 ? { italics: true } : {}, stats),
            spacing: { after: 160 },
            ...quoted,
          }),
        );
        break;
      }

      case "list": {
        const list = token as Tokens.List;
        stats.lists += 1;
        out.push(...listParagraphs(list, 0, stats, ctx));
        break;
      }

      case "blockquote": {
        const quote = token as Tokens.Blockquote;
        stats.blockquotes += 1;
        // Recurse with a deeper quote level so nested lists, code, and further
        // blockquotes all keep their own structure while inheriting the rule.
        out.push(
          ...blockTokens(quote.tokens, stats, { quoteDepth: ctx.quoteDepth + 1 }),
        );
        break;
      }

      case "code": {
        const code = token as Tokens.Code;
        stats.codeBlocks += 1;
        // One paragraph per source line keeps the line breaks intact — a single
        // run containing "\n" collapses to a space in Word.
        const lines = code.text.split("\n");
        lines.forEach((line, index) => {
          out.push(
            new Paragraph({
              children: [new TextRun({ text: line || " ", font: MONO_FONT, size: 20 })],
              shading: CODE_SHADING,
              spacing: {
                before: index === 0 ? 120 : 0,
                after: index === lines.length - 1 ? 160 : 0,
                line: 260,
              },
              indent: { left: 240 + QUOTE_INDENT * ctx.quoteDepth, right: 240 },
            }),
          );
        });
        break;
      }

      case "table": {
        const table = token as Tokens.Table;
        stats.tables += 1;
        out.push(buildTable(table, stats));
        // Word merges consecutive tables; a spacer paragraph keeps them apart.
        out.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        break;
      }

      case "hr":
        stats.horizontalRules += 1;
        out.push(
          new Paragraph({
            text: "",
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, space: 1, color: RULE_COLOR },
            },
            spacing: { before: 160, after: 240 },
          }),
        );
        break;

      case "space":
        break;

      case "html": {
        const text = stripTags((token as Tokens.HTML).text);
        if (text) {
          stats.paragraphs += 1;
          out.push(
            new Paragraph({ children: [new TextRun(text)], spacing: { after: 160 }, ...quoted }),
          );
        }
        break;
      }

      default: {
        const anyToken = token as { tokens?: Token[]; text?: string };
        if (anyToken.tokens?.length) {
          out.push(...blockTokens(anyToken.tokens, stats, ctx));
        } else if (anyToken.text?.trim()) {
          stats.paragraphs += 1;
          out.push(
            new Paragraph({
              children: [new TextRun(decodeEntities(anyToken.text))],
              spacing: { after: 160 },
              ...quoted,
            }),
          );
        }
      }
    }
  }

  return out;
}

/**
 * Flatten a (possibly nested) list into paragraphs carrying bullet/numbering
 * metadata. DOCX has no nested-list container — nesting is expressed purely by
 * the `level` on each item.
 */
function listParagraphs(
  list: Tokens.List,
  level: number,
  stats: DocxStats,
  ctx: BlockContext,
): Paragraph[] {
  const out: Paragraph[] = [];

  for (const item of list.items) {
    stats.listItems += 1;

    // An item's own text lives in its first block child; deeper lists follow.
    const inline: Token[] = [];
    const nested: Tokens.List[] = [];

    for (const child of item.tokens) {
      if (child.type === "list") {
        nested.push(child as Tokens.List);
      } else if (child.type === "text" || child.type === "paragraph") {
        const t = child as Tokens.Text | Tokens.Paragraph;
        inline.push(
          ...(t.tokens ?? [{ type: "text", raw: t.text, text: t.text } as unknown as Token]),
        );
      } else if (child.type !== "space") {
        // Code blocks / quotes nested in an item: keep their text on the item.
        inline.push(child);
      }
    }

    const children = inlineTokens(inline, {}, stats);

    // GFM task list: marked exposes `checked`. Word has no checkbox run, so the
    // conventional ballot characters stand in.
    const prefix =
      typeof item.checked === "boolean"
        ? [new TextRun({ text: item.checked ? "☒ " : "☐ " })]
        : [];

    out.push(
      new Paragraph({
        children: [...prefix, ...children],
        spacing: { after: 80 },
        ...(list.ordered
          ? { numbering: { reference: ORDERED_REF, level: Math.min(level, 4) } }
          : { bullet: { level: Math.min(level, 4) } }),
      }),
    );

    for (const sub of nested) {
      stats.lists += 1;
      out.push(...listParagraphs(sub, level + 1, stats, ctx));
    }
  }

  return out;
}

function buildTable(table: Tokens.Table, stats: DocxStats): Table {
  const alignments = table.align ?? [];

  const alignOf = (index: number) => {
    switch (alignments[index]) {
      case "center":
        return AlignmentType.CENTER;
      case "right":
        return AlignmentType.RIGHT;
      default:
        return AlignmentType.LEFT;
    }
  };

  const headerRow = new TableRow({
    tableHeader: true, // repeats across page breaks in Word
    children: table.header.map(
      (cell, index) =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, color: "auto", fill: "F1F3F5" },
          children: [
            new Paragraph({
              alignment: alignOf(index),
              children: inlineTokens(cell.tokens, { bold: true }, stats),
            }),
          ],
        }),
    ),
  });

  const bodyRows = table.rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell, index) =>
            new TableCell({
              children: [
                new Paragraph({
                  alignment: alignOf(index),
                  children: inlineTokens(cell.tokens, {}, stats),
                }),
              ],
            }),
        ),
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });
}

/* ------------------------------------------------------------------ public */

/** Numbering definition shared by every ordered list in the document. */
function orderedNumbering() {
  const formats = [
    LevelFormat.DECIMAL,
    LevelFormat.LOWER_LETTER,
    LevelFormat.LOWER_ROMAN,
    LevelFormat.DECIMAL,
    LevelFormat.LOWER_LETTER,
  ];
  return {
    config: [
      {
        reference: ORDERED_REF,
        levels: formats.map((format, level) => ({
          level,
          format,
          text: `%${level + 1}.`,
          alignment: AlignmentType.START,
          style: {
            paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } },
          },
        })),
      },
    ],
  };
}

/**
 * Build a docx `Document` from markdown.
 *
 * @throws MarkdownConversionError on empty or non-convertible input, so callers
 *         can surface a friendly message instead of producing a blank file.
 */
export function markdownToDocx(markdown: string, title?: string): DocxConversionResult {
  if (!markdown.trim()) {
    throw new MarkdownConversionError(
      "empty_input",
      "There's nothing to convert yet — paste or type some Markdown first.",
    );
  }

  const stats = emptyStats();

  let tokens: Token[];
  try {
    tokens = marked.lexer(markdown, { gfm: true });
  } catch (cause) {
    throw new MarkdownConversionError(
      "parse_failed",
      `That Markdown couldn't be parsed: ${(cause as Error).message}`,
    );
  }

  const children = blockTokens(tokens, stats);

  if (children.length === 0) {
    throw new MarkdownConversionError(
      "no_content",
      "No convertible content was found — the input looks like whitespace or comments only.",
    );
  }

  const doc = new Document({
    title: title ?? "Converted from Markdown",
    creator: "mdburst.com",
    description: "Generated by the mdburst Markdown to DOCX converter",
    numbering: orderedNumbering(),
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 } } },
    },
    sections: [{ children }],
  });

  return { doc, stats };
}

/**
 * Browser entry point: build the document and package it as a .docx Blob.
 * Kept separate from `markdownToDocx` so the mapping logic stays testable in
 * Node, where `Packer.toBlob` is unavailable.
 */
export async function markdownToDocxBlob(
  markdown: string,
  title?: string,
): Promise<{ blob: Blob; stats: DocxStats }> {
  const { doc, stats } = markdownToDocx(markdown, title);
  const blob = await Packer.toBlob(doc);
  return { blob, stats };
}

export { Packer };
