/**
 * PDF text layout -> Markdown.
 *
 * A PDF has no notion of a heading, a list, or a table — it has glyphs at
 * coordinates. Everything below is *inference* from geometry and font metrics:
 * relative font size implies heading level, x-position clusters imply table
 * columns, leading bullet glyphs imply lists, monospaced fonts imply code.
 * That inference is good on text-native, single-column documents and degrades
 * on complex layouts, which is exactly what the page copy tells users.
 *
 * This module is deliberately free of pdf.js and DOM APIs: it takes an already
 * normalized page model so the whole heuristic is unit-testable with synthetic
 * fixtures. The pdf.js glue lives in `./pdf-extract.ts`.
 *
 * Coordinates follow the PDF convention: origin bottom-left, y grows upward.
 */

/** One positioned text fragment, as produced by a PDF text layer. */
export interface PdfTextItem {
  str: string;
  /** Left edge in PDF user units. */
  x: number;
  /** Baseline position; larger values are higher up the page. */
  y: number;
  width: number;
  /** Rendered font size in user units. */
  height: number;
  /** Resolved font name, e.g. "ABCDEF+Arial-BoldMT". May be empty. */
  fontName: string;
}

/** A link annotation rectangle carrying its target URL. */
export interface PdfLink {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfPageContent {
  width: number;
  height: number;
  items: PdfTextItem[];
  links?: PdfLink[];
}

export interface PdfMarkdownStats {
  pages: number;
  headings: number;
  paragraphs: number;
  listItems: number;
  tables: number;
  codeBlocks: number;
  links: number;
  characters: number;
}

export interface PdfMarkdownResult {
  markdown: string;
  stats: PdfMarkdownStats;
  /** Non-fatal advisories shown above the output (scanned PDF, etc.). */
  warnings: string[];
}

export interface PdfToMarkdownOptions {
  /** Insert a thematic break between pages. Off by default so paragraphs
   *  spanning a page boundary stay joined. */
  pageSeparators?: boolean;
  /** Drop running headers/footers repeated across pages. */
  stripRunningHeads?: boolean;
}

/* ------------------------------------------------------- line construction */

interface Segment {
  text: string;
  x0: number;
  x1: number;
}

interface Line {
  page: number;
  /** Baseline y (higher = nearer the top of the page). */
  y: number;
  x0: number;
  x1: number;
  fontSize: number;
  mono: boolean;
  text: string;
  segments: Segment[];
}

/** Matches both real font names ("Courier-Bold") and the generic family
 *  pdf.js reports for standard fonts ("monospace"). */
const MONO_FONT = /mono|courier|consol|menlo|inconsolata|source ?code/i;

/** Bullet glyphs seen in real PDFs, including the ones Word and LaTeX emit. */
const BULLET = /^([•‣▪●◦⁃∙·■○*+–—-])\s+/;
const ORDERED = /^(\(?\d{1,3}[.)]|\(?[a-zA-Z][.)]|\(?[ivxlcdmIVXLCDM]{1,5}[.)])\s+/;

/** Bare URL, stopping before trailing punctuation that is almost always prose. */
const BARE_URL = /https?:\/\/[^\s<>()[\]]+[^\s<>()[\].,;:!?'"]/g;

function isMono(fontName: string): boolean {
  return MONO_FONT.test(fontName);
}

/**
 * Group raw items into visual lines.
 *
 * Items arrive in content-stream order, which is not reading order, so we sort
 * by descending y then ascending x, then bucket by baseline proximity.
 */
function buildLines(page: PdfPageContent, pageIndex: number): Line[] {
  const items = page.items.filter((item) => item.str !== "");
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const rows: PdfTextItem[][] = [];
  let current: PdfTextItem[] = [];
  let currentY = sorted[0]!.y;

  for (const item of sorted) {
    // Half the glyph height absorbs subscript/superscript jitter without
    // merging genuinely separate lines.
    const tolerance = Math.max(1.5, (item.height || 10) * 0.5);
    if (current.length > 0 && Math.abs(item.y - currentY) > tolerance) {
      rows.push(current);
      current = [];
    }
    if (current.length === 0) currentY = item.y;
    current.push(item);
  }
  if (current.length > 0) rows.push(current);

  return rows.map((row) => makeLine(row, pageIndex)).filter((line) => line.text !== "");
}

/**
 * Assemble one visual row into a Line, splitting it into cells.
 *
 * Two different things separate columns in real PDFs, and both must be handled:
 *
 *  - a *coordinate gap*, where the next fragment simply starts further right;
 *  - an explicit *wide space fragment*, where the generator emits a run of
 *    spaces to pad between columns. This is what Word, LibreOffice and most
 *    report writers actually do, and it leaves no coordinate gap at all —
 *    treating only the first case as a separator merges every table row into a
 *    single cell.
 */
function makeLine(row: PdfTextItem[], pageIndex: number): Line {
  const ordered = [...row].sort((a, b) => a.x - b.x);

  const fontSize = Math.max(...ordered.map((i) => i.height || 0), 1);
  const charCount = ordered.reduce((sum, i) => sum + i.str.trim().length, 0) || 1;
  const monoChars = ordered.reduce(
    (sum, i) => sum + (isMono(i.fontName) ? i.str.trim().length : 0),
    0,
  );

  // A gap wider than roughly one em starts a new cell — the signal used later
  // for table-column detection.
  const cellGap = fontSize * 1.2;

  const segments: Segment[] = [];
  let buffer = "";
  let segStart: number | null = null;
  let cursor = ordered[0]!.x;

  const closeSegment = () => {
    if (buffer.trim() === "" || segStart === null) return;
    segments.push({ text: buffer.trim(), x0: segStart, x1: cursor });
    buffer = "";
    segStart = null;
  };

  for (const item of ordered) {
    const blank = item.str.trim() === "";
    const spacer = blank && item.width > cellGap;
    const gap = item.x - cursor;

    if (spacer || gap > cellGap) closeSegment();

    if (spacer) {
      // The padding run itself contributes no text.
      cursor = item.x + item.width;
      continue;
    }

    if (segStart === null) {
      segStart = item.x;
    } else if (buffer !== "" && !blank && gap > fontSize * 0.18 && !/\s$/.test(buffer)) {
      // Kerned word break: pdf.js often omits the space glyph entirely.
      buffer += " ";
    }

    buffer += item.str;
    cursor = item.x + item.width;
  }
  closeSegment();

  const text = segments
    .map((s) => s.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    page: pageIndex,
    y: ordered[0]!.y,
    x0: ordered[0]!.x,
    x1: cursor,
    fontSize,
    mono: monoChars / charCount > 0.6,
    text,
    segments,
  };
}

/* ----------------------------------------------------- running head removal */

/** Normalize a line so "Page 3 of 9" and "Page 7 of 9" collapse together. */
function headFootKey(text: string): string {
  return text.replace(/\d+/g, "#").trim().toLowerCase();
}

/**
 * Drop headers/footers that repeat across pages. Only lines in the top/bottom
 * 8% of the page are candidates, so a legitimately repeated phrase in body copy
 * is never removed.
 */
function removeRunningHeads(lines: Line[], pages: PdfPageContent[]): Line[] {
  const inMargin = (line: Line): boolean => {
    const page = pages[line.page];
    if (!page) return false;
    const margin = page.height * 0.08;
    return line.y > page.height - margin || line.y < margin;
  };

  // Bare page numbers are droppable no matter how short the document is.
  const withoutFolios = lines.filter(
    (line) => !(inMargin(line) && /^(page\s+)?\d+(\s+of\s+\d+)?$/i.test(line.text)),
  );

  if (pages.length < 3) return withoutFolios;

  const counts = new Map<string, Set<number>>();
  for (const line of withoutFolios) {
    if (!inMargin(line) || line.text.length > 120) continue;
    const key = headFootKey(line.text);
    if (!counts.has(key)) counts.set(key, new Set());
    counts.get(key)!.add(line.page);
  }

  const threshold = Math.max(3, Math.ceil(pages.length * 0.6));
  const repeated = new Set(
    [...counts.entries()].filter(([, seen]) => seen.size >= threshold).map(([key]) => key),
  );

  return withoutFolios.filter(
    (line) => !inMargin(line) || !repeated.has(headFootKey(line.text)),
  );
}

/* ---------------------------------------------------------- classification */

/** Character-weighted median font size — the document's body text size. */
function bodyFontSize(lines: Line[]): number {
  const weighted: number[] = [];
  for (const line of lines) {
    // Round to a tenth so near-identical sizes bucket together.
    const size = Math.round(line.fontSize * 10) / 10;
    for (let i = 0; i < Math.max(1, Math.ceil(line.text.length / 10)); i += 1) {
      weighted.push(size);
    }
  }
  if (weighted.length === 0) return 12;
  weighted.sort((a, b) => a - b);
  return weighted[Math.floor(weighted.length / 2)]!;
}

/**
 * Map the distinct above-body font sizes to heading levels, largest first.
 * Ranking rather than thresholding on absolute ratios means a document whose
 * H1 is only 1.3x body still gets `#` rather than `###`.
 */
function headingScale(lines: Line[], body: number): Map<number, number> {
  const sizes = new Set<number>();
  for (const line of lines) {
    const size = Math.round(line.fontSize * 10) / 10;
    if (size >= body * 1.12 && line.text.length <= 200) sizes.add(size);
  }
  const ranked = [...sizes].sort((a, b) => b - a).slice(0, 6);
  return new Map(ranked.map((size, index) => [size, index + 1]));
}

/* -------------------------------------------------------- table detection */

/**
 * Decide whether consecutive multi-cell lines form a table.
 *
 * Requires at least two rows whose cell counts match and whose column left
 * edges line up within a tolerance. Both signals must agree before we commit,
 * because a false positive mangles ordinary prose into a grid.
 */
function alignsAsTable(rows: Line[]): boolean {
  if (rows.length < 2) return false;
  const cellCount = rows[0]!.segments.length;
  if (cellCount < 2) return false;
  if (!rows.every((row) => row.segments.length === cellCount)) return false;

  const tolerance = Math.max(6, rows[0]!.fontSize * 1.5);
  for (let column = 0; column < cellCount; column += 1) {
    const positions = rows.map((row) => row.segments[column]!.x0);
    if (Math.max(...positions) - Math.min(...positions) > tolerance) return false;
  }
  return true;
}

/* ---------------------------------------------------------------- escaping */

/** Escape characters that would otherwise be read as Markdown syntax. */
function escapeChars(text: string): string {
  return text.replace(/([\\`*_{}[\]])/g, "\\$1");
}

/** Escape a leading `#`/`>` so body text isn't promoted to a heading/quote. */
function escapeLineStart(text: string): string {
  return text.replace(/^(\s*)([#>])/, "$1\\$2");
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

/* ----------------------------------------------------------- inline render */

interface ProtectedSpan {
  start: number;
  end: number;
  /** Already-formed Markdown; must not be escaped. */
  markdown: string;
}

/**
 * Render one line's text to Markdown inline syntax.
 *
 * Link targets are collected first and reserved as protected spans, then the
 * remaining prose is escaped. Doing it in this order matters: escaping first
 * would rewrite `a_b` inside a URL to `a\_b` and break the link.
 */
function renderInline(
  rawText: string,
  line: Line,
  links: PdfLink[],
  stats: PdfMarkdownStats,
): string {
  const spans: ProtectedSpan[] = [];

  // 1. Link annotations covering a segment of this line.
  for (const link of links) {
    const overlapsVertically =
      line.y >= link.y - link.height * 0.5 && line.y <= link.y + link.height * 1.5;
    if (!overlapsVertically) continue;

    const covered = line.segments.find(
      (segment) => segment.x1 > link.x && segment.x0 < link.x + link.width,
    );
    if (!covered || covered.text === "") continue;

    const start = rawText.indexOf(covered.text);
    if (start === -1) continue;

    spans.push({
      start,
      end: start + covered.text.length,
      markdown: `[${escapeChars(covered.text)}](${link.url})`,
    });
  }

  // 2. Bare URLs in the text itself.
  for (const match of rawText.matchAll(BARE_URL)) {
    if (match.index === undefined) continue;
    spans.push({
      start: match.index,
      end: match.index + match[0].length,
      markdown: `<${match[0]}>`,
    });
  }

  // Resolve overlaps: earliest start wins, longest first on ties.
  spans.sort((a, b) => a.start - b.start || b.end - a.end);

  const pieces: string[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start < cursor) continue; // overlapped by an earlier span
    pieces.push(escapeChars(rawText.slice(cursor, span.start)));
    pieces.push(span.markdown);
    stats.links += 1;
    cursor = span.end;
  }
  pieces.push(escapeChars(rawText.slice(cursor)));

  return escapeLineStart(pieces.join(""));
}

/* -------------------------------------------------------------------- main */

/**
 * Convert normalized PDF page content into Markdown.
 *
 * Never throws on odd input — a partially recovered document is more useful
 * than an error. Structural failure (no text layer at all) surfaces as a
 * warning plus empty markdown, which the caller renders as guidance.
 */
export function pdfPagesToMarkdown(
  pages: PdfPageContent[],
  options: PdfToMarkdownOptions = {},
): PdfMarkdownResult {
  const { pageSeparators = false, stripRunningHeads = true } = options;

  const stats: PdfMarkdownStats = {
    pages: pages.length,
    headings: 0,
    paragraphs: 0,
    listItems: 0,
    tables: 0,
    codeBlocks: 0,
    links: 0,
    characters: 0,
  };
  const warnings: string[] = [];

  let lines: Line[] = [];
  pages.forEach((page, index) => {
    lines.push(...buildLines(page, index));
  });

  stats.characters = lines.reduce((sum, line) => sum + line.text.length, 0);

  if (lines.length === 0) {
    warnings.push(
      "No text layer was found in this PDF. It is almost certainly a scan or an " +
        "image export — the pages contain pictures of text, not text. Run it " +
        "through OCR first, then convert the result.",
    );
    return { markdown: "", stats, warnings };
  }

  // A text layer that exists but is nearly empty means a mostly-scanned file:
  // a cover page with real text, or a scan with one searchable footer.
  const charsPerPage = stats.characters / Math.max(1, pages.length);
  if (charsPerPage < 80) {
    warnings.push(
      `Only about ${Math.round(charsPerPage)} characters of text were found per page. ` +
        "This PDF looks mostly scanned, so the output below will be sparse. " +
        "Run it through OCR first for a usable conversion.",
    );
  }

  if (stripRunningHeads) lines = removeRunningHeads(lines, pages);

  const body = bodyFontSize(lines);
  const scale = headingScale(lines, body);

  // Left margin per page, used to infer list nesting depth. Precomputed once —
  // deriving it inside the line loop is quadratic on long documents.
  const pageLeft = new Map<number, number>();
  for (const line of lines) {
    const known = pageLeft.get(line.page);
    if (known === undefined || line.x0 < known) pageLeft.set(line.page, line.x0);
  }

  const out: string[] = [];
  let paragraph: string[] = [];
  let codeBuffer: string[] = [];
  let lastLine: Line | undefined;
  let lastPage = 0;
  let inList = false;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    out.push(paragraph.join(" ").replace(/\s+/g, " ").trim(), "");
    paragraph = [];
    stats.paragraphs += 1;
  };

  const flushCode = () => {
    if (codeBuffer.length === 0) return;
    out.push("```", ...codeBuffer, "```", "");
    codeBuffer = [];
    stats.codeBlocks += 1;
  };

  const closeList = () => {
    if (!inList) return;
    out.push("");
    inList = false;
  };

  const flushAll = () => {
    flushParagraph();
    flushCode();
    closeList();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const pageLinks = pages[line.page]?.links ?? [];

    if (pageSeparators && line.page !== lastPage) {
      flushAll();
      out.push("---", "");
    }
    lastPage = line.page;

    /* ---- table: look ahead for aligned multi-cell rows ---- */
    if (line.segments.length >= 2 && !line.mono) {
      const candidate: Line[] = [line];
      let lookahead = index + 1;
      while (
        lookahead < lines.length &&
        lines[lookahead]!.page === line.page &&
        lines[lookahead]!.segments.length === line.segments.length
      ) {
        candidate.push(lines[lookahead]!);
        lookahead += 1;
      }

      if (alignsAsTable(candidate)) {
        flushAll();
        const [header, ...rest] = candidate;
        const columns = header!.segments.length;
        out.push(`| ${header!.segments.map((s) => escapeCell(s.text)).join(" | ")} |`);
        out.push(`| ${Array.from({ length: columns }, () => "---").join(" | ")} |`);
        for (const row of rest) {
          out.push(`| ${row.segments.map((s) => escapeCell(s.text)).join(" | ")} |`);
        }
        out.push("");
        stats.tables += 1;
        index = lookahead - 1;
        lastLine = candidate[candidate.length - 1];
        continue;
      }
    }

    /* ---- fenced code ---- */
    if (line.mono) {
      flushParagraph();
      closeList();
      codeBuffer.push(line.text);
      lastLine = line;
      continue;
    }
    flushCode();

    /* ---- heading ---- */
    const rounded = Math.round(line.fontSize * 10) / 10;
    const level = scale.get(rounded);
    if (level !== undefined && line.text.length <= 200 && !/[.;:,]$/.test(line.text)) {
      flushAll();
      out.push(`${"#".repeat(level)} ${renderInline(line.text, line, pageLinks, stats)}`, "");
      stats.headings += 1;
      lastLine = line;
      continue;
    }

    /* ---- list items ---- */
    const bulletMatch = line.text.match(BULLET);
    const orderedMatch = bulletMatch ? null : line.text.match(ORDERED);

    if (bulletMatch || orderedMatch) {
      flushParagraph();
      const marker = (bulletMatch ?? orderedMatch)!;
      const content = line.text.slice(marker[0].length).trim();
      const left = pageLeft.get(line.page) ?? line.x0;
      const depth = Math.min(3, Math.max(0, Math.floor((line.x0 - left) / 24)));
      const indent = "  ".repeat(depth);
      const rendered = renderInline(content, line, pageLinks, stats);

      out.push(
        orderedMatch
          ? `${indent}${marker[0].replace(/[^\dA-Za-z]/g, "")}. ${rendered}`
          : `${indent}- ${rendered}`,
      );
      stats.listItems += 1;
      inList = true;
      lastLine = line;
      continue;
    }

    closeList();

    /* ---- paragraph text ---- */
    const rendered = renderInline(line.text, line, pageLinks, stats);

    if (lastLine && paragraph.length > 0) {
      const sameColumn = Math.abs(line.x0 - lastLine.x0) < line.fontSize * 2;
      const verticalGap = lastLine.page === line.page ? lastLine.y - line.y : line.fontSize * 1.2;

      if (verticalGap > line.fontSize * 2.1 || !sameColumn) {
        flushParagraph();
      } else {
        // De-hyphenate a word split across the line break.
        const previous = paragraph[paragraph.length - 1]!;
        if (/[a-z]-$/.test(previous) && /^[a-z]/.test(line.text)) {
          paragraph[paragraph.length - 1] = previous.replace(/-$/, "") + rendered;
          lastLine = line;
          continue;
        }
      }
    }

    paragraph.push(rendered);
    lastLine = line;
  }

  flushAll();

  const markdown = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  if (stats.tables > 0) {
    warnings.push(
      "Tables were reconstructed from column positions. Check any table with " +
        "merged or wrapped cells — those are the ones that drift.",
    );
  }

  return { markdown: markdown === "" ? "" : `${markdown}\n`, stats, warnings };
}
