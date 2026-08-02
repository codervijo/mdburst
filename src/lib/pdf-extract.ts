/**
 * pdf.js glue: File -> normalized page model consumed by `./pdf-to-markdown`.
 *
 * Everything here runs in the browser and never transmits the file. pdf.js is
 * loaded via dynamic `import()` so its ~1 MB of worker code stays off the
 * initial page load — the tool UI renders and is interactive before the parser
 * is fetched, which only happens once a user actually picks a file.
 *
 * Kept separate from the conversion heuristics so those stay unit-testable
 * without a headless browser.
 */

import type { PdfLink, PdfPageContent, PdfTextItem } from "./pdf-to-markdown";

/** Hard ceiling on input size. Larger files reliably exhaust the main thread. */
export const MAX_PDF_BYTES = 25 * 1024 * 1024;

/** Page ceiling — beyond this the conversion is slow enough to feel broken. */
export const MAX_PDF_PAGES = 500;

export type PdfErrorCode =
  | "wrong_type"
  | "too_large"
  | "empty_file"
  | "encrypted"
  | "corrupt"
  | "too_many_pages"
  | "worker_failed"
  | "unknown";

export class PdfExtractionError extends Error {
  readonly code: PdfErrorCode;
  constructor(code: PdfErrorCode, message: string) {
    super(message);
    this.name = "PdfExtractionError";
    this.code = code;
  }
}

export interface ExtractProgress {
  page: number;
  totalPages: number;
}

/**
 * Validate a candidate file before any parsing work.
 *
 * Runs on the File metadata only — cheap, synchronous, and gives the user a
 * precise message instead of a parser stack trace.
 */
export function validatePdfFile(file: File): void {
  const looksPdf =
    file.type === "application/pdf" ||
    file.type === "application/x-pdf" ||
    /\.pdf$/i.test(file.name);

  if (!looksPdf) {
    throw new PdfExtractionError(
      "wrong_type",
      `That's not a PDF. "${file.name}" looks like ${file.type || "an unknown file type"} — ` +
        "this converter reads .pdf files only.",
    );
  }

  if (file.size === 0) {
    throw new PdfExtractionError(
      "empty_file",
      `"${file.name}" is empty (0 bytes). Try re-exporting or re-downloading it.`,
    );
  }

  if (file.size > MAX_PDF_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new PdfExtractionError(
      "too_large",
      `That file is ${mb} MB, over the ${MAX_PDF_BYTES / 1024 / 1024} MB limit. ` +
        "Because conversion runs entirely in your browser, very large files can " +
        "freeze the tab. Split the PDF and convert it in parts.",
    );
  }
}

/** Confirm the bytes actually begin with a PDF header. */
function assertPdfHeader(bytes: Uint8Array, fileName: string): void {
  // "%PDF-" — some generators emit leading whitespace, so scan a small window.
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  if (!header.includes("%PDF-")) {
    throw new PdfExtractionError(
      "corrupt",
      `"${fileName}" has a .pdf name but no PDF header. It may be renamed, ` +
        "truncated, or corrupted in transfer.",
    );
  }
}

type PdfJsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfJsModule> | undefined;

/**
 * Load pdf.js once per page and point it at its worker.
 *
 * The worker URL is resolved through Vite's `?url` import so the file is
 * fingerprinted and served from our own origin — no CDN dependency, which
 * matters both for the privacy claim and for the CSP-free static host.
 */
async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const [pdfjs, workerUrl] = await Promise.all([
        import("pdfjs-dist"),
        import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((m) => m.default),
      ]);
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })().catch((cause) => {
      pdfjsPromise = undefined; // let a retry re-attempt the load
      throw new PdfExtractionError(
        "worker_failed",
        `The PDF engine couldn't start (${(cause as Error).message}). ` +
          "Reload the page and try again.",
      );
    });
  }
  return pdfjsPromise;
}

/** Font descriptors pdf.js returns alongside a page's text content. */
type TextStyles = Record<string, { fontFamily?: string } | undefined>;

interface CommonObjs {
  commonObjs: { has(k: string): boolean; get(k: string): unknown };
}

/**
 * Resolve pdf.js's internal font id (`g_d0_f5`) to something describing the
 * actual typeface.
 *
 * `commonObjs` holds the real embedded name, but it is only populated once the
 * page's operator list has been processed — `getTextContent()` alone leaves it
 * empty. Rather than pay for a full `getOperatorList()` on every page, we fall
 * back to the `styles` map that comes back with the text content, whose
 * `fontFamily` resolves standard fonts to a generic family ("monospace" for
 * Courier). That is precisely the signal the code-block heuristic needs.
 */
function resolveFontName(page: CommonObjs, id: string, styles: TextStyles): string {
  if (!id) return "";

  try {
    if (page.commonObjs.has(id)) {
      const font = page.commonObjs.get(id) as { name?: string; fallbackName?: string } | null;
      const name = font?.name ?? font?.fallbackName;
      if (name) return name;
    }
  } catch {
    // commonObjs throws when the font isn't resolved yet; fall through.
  }

  return styles[id]?.fontFamily ?? id;
}

/** Minimal structural view of the pdf.js page proxy this module consumes. */
type PageLike = CommonObjs & {
  getViewport(options: { scale: number }): { width: number; height: number };
  getTextContent(): Promise<{ items: unknown[]; styles?: TextStyles }>;
  getAnnotations(options: { intent: string }): Promise<unknown[]>;
};

/**
 * Turn one pdf.js page into the normalized model the converter consumes.
 *
 * Exported so the coordinate and font-name mapping can be exercised against a
 * real PDF outside the browser — this is the layer where a pdf.js API change
 * silently produces wrong geometry rather than an error.
 */
export async function normalizePage(page: PageLike): Promise<PdfPageContent> {
  const viewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();
  const styles: TextStyles = textContent.styles ?? {};

  const items: PdfTextItem[] = [];
  for (const raw of textContent.items) {
    const entry = raw as {
      str?: string;
      transform?: number[];
      width?: number;
      height?: number;
      fontName?: string;
    };
    if (typeof entry.str !== "string") continue; // marked-content marker, not text

    const transform = entry.transform ?? [];
    // transform is [scaleX, skewY, skewX, scaleY, translateX, translateY];
    // the glyph height is the magnitude of the second column.
    const fontSize = Math.hypot(transform[2] ?? 0, transform[3] ?? 0);

    items.push({
      str: entry.str,
      x: transform[4] ?? 0,
      y: transform[5] ?? 0,
      width: entry.width || 0,
      height: entry.height || fontSize || 0,
      fontName: resolveFontName(page, entry.fontName ?? "", styles),
    });
  }

  const links: PdfLink[] = [];
  try {
    for (const raw of await page.getAnnotations({ intent: "display" })) {
      const annotation = raw as { url?: string; rect?: number[] };
      const { url, rect } = annotation;
      if (!url || !rect || rect.length < 4) continue;

      const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = rect;
      links.push({
        url,
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      });
    }
  } catch {
    // Annotation parsing is best-effort; a malformed annotation dictionary
    // must not cost us the page's text.
  }

  return { width: viewport.width, height: viewport.height, items, links };
}

/**
 * Read every page's text layer and link annotations.
 *
 * @param file  the user's PDF, never uploaded anywhere
 * @param onProgress called after each page so the UI can show real progress
 */
export async function extractPdfPages(
  file: File,
  onProgress?: (progress: ExtractProgress) => void,
): Promise<PdfPageContent[]> {
  validatePdfFile(file);

  const bytes = new Uint8Array(await file.arrayBuffer());
  assertPdfHeader(bytes, file.name);

  const pdfjs = await loadPdfJs();

  // `destroy()` lives on the loading task, not the document proxy, so the task
  // is held for the lifetime of the extraction and torn down in `finally`.
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    // Keep everything local: no remote CMap or standard-font fetches.
    useSystemFonts: true,
  });

  let document;
  try {
    document = await loadingTask.promise;
  } catch (cause) {
    const message = (cause as Error).message ?? "";
    if (/password/i.test(message)) {
      throw new PdfExtractionError(
        "encrypted",
        `"${file.name}" is password-protected. Remove the password (open it in a ` +
          "PDF reader and re-save without encryption) and try again.",
      );
    }
    throw new PdfExtractionError(
      "corrupt",
      `"${file.name}" couldn't be opened: ${message || "the file structure is invalid"}.`,
    );
  }

  if (document.numPages > MAX_PDF_PAGES) {
    await loadingTask.destroy();
    throw new PdfExtractionError(
      "too_many_pages",
      `That PDF has ${document.numPages} pages, over the ${MAX_PDF_PAGES}-page limit ` +
        "for in-browser conversion. Split it into smaller files.",
    );
  }

  const pages: PdfPageContent[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      pages.push(await normalizePage(page));
      page.cleanup();
      onProgress?.({ page: pageNumber, totalPages: document.numPages });
    }
  } finally {
    // Releases the worker and its buffers; without this a long session
    // converting several files leaks a worker per conversion.
    await loadingTask.destroy();
  }

  return pages;
}
