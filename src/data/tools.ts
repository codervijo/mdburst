/**
 * Registry for the free /tools/* converters.
 *
 * One record per tool, consumed by:
 *   - the tool pages themselves (metadata, breadcrumbs, FAQ, related links)
 *   - the /tools/ directory index
 *   - the JSON-LD builders in `src/lib/schema.ts`
 *
 * The FAQ lives here rather than in page markup because the visible FAQ and the
 * FAQPage structured data are rendered from this same array. Google requires
 * the markup to match what a user actually sees; sourcing both from one array
 * makes divergence impossible rather than merely unlikely.
 */

export const SITE_URL = "https://mdburst.com";

export interface FaqEntry {
  question: string;
  /** Plain text — rendered verbatim in the page and in the FAQPage schema. */
  answer: string;
}

export interface ToolDefinition {
  slug: string;
  /** Canonical path, always with a trailing slash to match the sitemap. */
  path: string;
  /** <title> — distinct from h1. */
  title: string;
  h1: string;
  metaDescription: string;
  /** Short label for nav, breadcrumbs and directory cards. */
  shortName: string;
  /** One-line summary used on the directory index and in related-tool cards. */
  summary: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  /** Slugs of the other tools to cross-link from this page. */
  related: string[];
  faqs: FaqEntry[];

  /* --- hub-page fields: the cards and comparison table on /tools/ --- */
  /** What goes in, e.g. "PDF file (.pdf)". */
  input: string;
  /** What comes out, e.g. "Markdown (.md)". */
  output: string;
  /** One line on the situation this tool is the right answer for. */
  bestFor: string;
  /** Three or four concrete capabilities, not marketing adjectives. */
  keyFeatures: string[];
  /** The single most important thing it cannot do. */
  mainLimitation: string;
  /** How this specific tool handles the user's data. */
  privacyNote: string;
  /** Label for the card's call to action. */
  ctaLabel: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    slug: "pdf-to-markdown",
    path: "/tools/pdf-to-markdown/",
    title: "PDF to Markdown Converter – Convert PDF to Markdown Online | mdburst",
    h1: "PDF to Markdown Converter",
    metaDescription:
      "Free PDF to Markdown converter. Convert PDF to Markdown in your browser — headings, lists, tables, links and code blocks preserved. No upload, no signup.",
    shortName: "PDF to Markdown",
    summary:
      "Turn a PDF into clean, editable Markdown without uploading the file anywhere.",
    primaryKeyword: "PDF to Markdown",
    secondaryKeywords: ["Convert PDF to Markdown", "PDF to Markdown converter"],
    related: ["markdown-to-docx"],
    input: "PDF file (.pdf), up to 25 MB / 500 pages",
    output: "Markdown (.md), editable before you copy or download",
    bestFor:
      "Recovering the text of a report, spec or paper when the PDF is the only copy you still have.",
    keyFeatures: [
      "Infers heading levels from the document's own font sizes",
      "Rebuilds simple tables from column positions",
      "Keeps links from PDF annotations and autolinks bare URLs",
      "Strips repeated headers, footers and page numbers",
    ],
    mainLimitation:
      "Scanned PDFs produce nothing — there is no text layer to read, so OCR has to come first.",
    privacyNote:
      "The PDF is parsed by a worker on this origin. No upload endpoint exists on the page.",
    ctaLabel: "Convert a PDF",
    faqs: [
      {
        question: "Is this PDF to Markdown converter free?",
        answer:
          "Yes. The converter is free and has no signup, no account, and no usage cap. It runs as a static page with the conversion happening in your own browser, so there are no per-file costs for us to pass on.",
      },
      {
        question: "Are my PDFs uploaded to a server?",
        answer:
          "No. The file is read by JavaScript running in your browser tab and never leaves your device. There is no upload endpoint on this page — you can confirm it by opening your browser's network panel while converting, or by disconnecting from the internet after the page loads and converting offline.",
      },
      {
        question: "Can it convert scanned PDFs?",
        answer:
          "No. A scanned PDF contains images of text rather than text, and this converter reads the text layer only. If you convert a scan you will get an empty result and a warning telling you so. Run the file through OCR software first, then convert the searchable PDF it produces.",
      },
      {
        question: "Does it preserve tables from the PDF?",
        answer:
          "It reconstructs simple tables by detecting columns of text that share the same left edge across consecutive rows, then emits GitHub-flavored Markdown tables. Tables with merged cells, cells that wrap onto several lines, or borderless layouts used purely for visual alignment are where the detection is least reliable, so check those against the original.",
      },
      {
        question: "Why does my converted Markdown have the wrong heading levels?",
        answer:
          "Heading level is inferred from font size, because PDFs record type size rather than document structure. The largest text above the body size becomes an H1, the next largest an H2, and so on. A document whose headings are distinguished by weight or color instead of size will not map cleanly, and the output is editable so you can correct it in place.",
      },
      {
        question: "What is the maximum file size?",
        answer:
          "25 MB and 500 pages. Both limits exist because the conversion happens on your device rather than on a server — a much larger file can lock up the browser tab. For anything bigger, split the PDF and convert it in parts.",
      },
    ],
  },
  {
    slug: "markdown-to-docx",
    path: "/tools/markdown-to-docx/",
    title: "Markdown to DOCX Converter – Export Markdown to Word | mdburst",
    h1: "Markdown to DOCX Converter",
    metaDescription:
      "Free Markdown to DOCX converter. Turn Markdown into a real Word document with proper headings, lists, tables and styles. Runs in your browser — no upload.",
    shortName: "Markdown to DOCX",
    summary:
      "Export Markdown as a real .docx with genuine Word headings, lists and tables.",
    primaryKeyword: "Markdown to DOCX",
    secondaryKeywords: ["Markdown to Word", "export Markdown to DOCX"],
    related: ["pdf-to-markdown"],
    input: "Markdown text, pasted or typed",
    output: "Word document (.docx) with native styles",
    bestFor:
      "Handing a Markdown draft to someone who works in Word and expects to track changes.",
    keyFeatures: [
      "Real Word heading styles, so the navigation pane and table of contents work",
      "Native tables with a header row that repeats across pages",
      "Ordered lists bound to a numbering definition, so Word renumbers correctly",
      "Live preview of the structure before you download",
    ],
    mainLimitation:
      "Images become alt-text placeholders — fetching them would mean a network request.",
    privacyNote:
      "The document is assembled in the page and saved as a local blob. Nothing is transmitted.",
    ctaLabel: "Convert Markdown",
    faqs: [
      {
        question: "Does the .docx contain real Word headings?",
        answer:
          "Yes. A Markdown H1 becomes Word's built-in Heading 1 style, H2 becomes Heading 2, and so on. That means the document outline works in Word's navigation pane, the headings restyle when you change the theme, and exporting to PDF produces a real bookmark tree. The converter does not simply enlarge and bold the text.",
      },
      {
        question: "Can I open the file in Google Docs or LibreOffice?",
        answer:
          "Yes. The output is standard Office Open XML — the same .docx format Word itself writes — so Google Docs, LibreOffice Writer, Pages and Office Online all open it. Heading styles and tables survive the trip; the exact fonts may be substituted depending on what the application has available.",
      },
      {
        question: "Is my Markdown sent to a server?",
        answer:
          "No. The document is assembled in your browser and saved straight to your downloads folder. Nothing is transmitted, logged, or stored, which also means the tool works with your network disconnected once the page has loaded.",
      },
      {
        question: "Are Markdown tables converted to real Word tables?",
        answer:
          "Yes. A GitHub-flavored Markdown table becomes a native Word table with a repeating header row, so it splits correctly across pages, and column alignment markers are carried across. You can edit and restyle it in Word exactly like a table you created there.",
      },
      {
        question: "What happens to images in my Markdown?",
        answer:
          "Image references are preserved as an italic placeholder showing the alt text, not as embedded pictures. Fetching a remote image would mean sending a request for it, which would break the guarantee that nothing leaves your browser, so the reference is kept visible for you to reinsert deliberately.",
      },
      {
        question: "Which Markdown flavor is supported?",
        answer:
          "GitHub-flavored Markdown: headings, paragraphs, bold, italic, strikethrough, ordered and unordered lists with nesting, task lists, links, blockquotes, fenced and inline code, tables, and horizontal rules. Raw HTML blocks are reduced to their visible text, since Word has no equivalent for arbitrary markup.",
      },
    ],
  },
];

/**
 * FAQ for the /tools/ hub.
 *
 * Deliberately answers *cross-tool* questions — which one to pick, what they
 * share, what they don't cover. Repeating a tool page's FAQ here would create
 * duplicate copy competing for the same query, which is the opposite of what
 * the hub is for.
 */
export const HUB_FAQS: FaqEntry[] = [
  {
    question: "Are these Markdown tools really free?",
    answer:
      "Yes — no account, no email, no usage cap, and no paid tier hidden behind the useful part. They are static pages that work in your browser, so each conversion costs us nothing to run.",
  },
  {
    question: "Do any of these tools upload my files?",
    answer:
      "No. Each converter reads your file with the browser's File API and processes it in the page. There is no upload endpoint, because the site is statically hosted with nothing server-side to receive one. Watch your network panel during a conversion to confirm it.",
  },
  {
    question: "Which tool should I use to get a PDF into Word?",
    answer:
      "Chain them: convert the PDF to Markdown, correct whatever the layout inference got wrong while it is still plain text, then convert that Markdown to DOCX. The Markdown step is what makes fixing headings and tables cheap.",
  },
  {
    question: "Why is the output not a perfect match for my original?",
    answer:
      "The formats record different things. A PDF stores glyph positions with no notion of a heading, so converting out of one means inferring structure from geometry. Both directions involve judgement calls, which is why you get an editable result rather than a claim of exactness.",
  },
  {
    question: "Do the tools work on a phone?",
    answer:
      "Yes — both pages are responsive and conversion runs on the device. Large PDFs are noticeably slower on a phone, because the parsing is real work happening locally rather than on a server.",
  },
];

export function getTool(slug: string): ToolDefinition {
  const tool = TOOLS.find((entry) => entry.slug === slug);
  if (!tool) throw new Error(`Unknown tool: ${slug}`);
  return tool;
}

export function relatedTools(slug: string): ToolDefinition[] {
  return getTool(slug).related.map(getTool);
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}
