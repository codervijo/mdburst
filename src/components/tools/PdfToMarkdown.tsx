/**
 * PDF to Markdown converter island.
 *
 * Loads pdf.js lazily on first file selection, extracts each page's text layer
 * with progress reporting, runs the layout heuristics, and hands back editable
 * Markdown. Nothing is transmitted: the File is read with FileReader/ArrayBuffer
 * and parsed in a worker on the same origin.
 */

import * as React from "react";
import { FileText } from "lucide-react";
import {
  CopyButton,
  Dropzone,
  DownloadIcon,
  ErrorBanner,
  PanelHeading,
  PrimaryAction,
  ProductCta,
  ResetButton,
  StatChips,
  StatusLine,
  ToolShell,
  WarningList,
  baseName,
  downloadBlob,
} from "./toolkit";
import {
  trackConversionFailed,
  trackConversionStarted,
  trackConversionSucceeded,
  trackFileSelected,
  trackOutputCopied,
  trackOutputDownloaded,
  trackToolView,
} from "../../analytics/ga";
import { initAnalytics } from "../../analytics/init";
import type { PdfMarkdownStats } from "../../lib/pdf-to-markdown";

const TOOL = "pdf-to-markdown" as const;

type Phase = "idle" | "reading" | "converting" | "done" | "error";

interface Outcome {
  markdown: string;
  stats: PdfMarkdownStats;
  warnings: string[];
}

export default function PdfToMarkdown() {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [fileName, setFileName] = React.useState("");
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState("");
  const [outcome, setOutcome] = React.useState<Outcome | null>(null);
  const [markdown, setMarkdown] = React.useState("");

  React.useEffect(() => {
    initAnalytics();
    trackToolView(TOOL);
  }, []);

  const reset = () => {
    setPhase("idle");
    setFileName("");
    setProgress(0);
    setError("");
    setOutcome(null);
    setMarkdown("");
  };

  const convert = async (file: File, source: "drop" | "picker") => {
    setError("");
    setOutcome(null);
    setMarkdown("");
    setFileName(file.name);
    setProgress(0);
    trackFileSelected(TOOL, {
      sizeBytes: file.size,
      mimeType: file.type || "unknown",
      source,
    });

    const startedAt = performance.now();
    setPhase("reading");
    trackConversionStarted(TOOL, { size_kb: Math.round(file.size / 1024) });

    try {
      // Imported here rather than at module scope so the ~1 MB parser is
      // fetched only when someone actually converts something.
      const [{ extractPdfPages, PdfExtractionError }, { pdfPagesToMarkdown }] =
        await Promise.all([
          import("../../lib/pdf-extract"),
          import("../../lib/pdf-to-markdown"),
        ]);

      try {
        const pages = await extractPdfPages(file, ({ page, totalPages }) => {
          setProgress((page / totalPages) * 100);
        });

        setPhase("converting");
        // Yield a frame so the status line repaints before the synchronous
        // conversion pass begins.
        await new Promise((resolve) => setTimeout(resolve, 0));

        const result = pdfPagesToMarkdown(pages);
        setOutcome(result);
        setMarkdown(result.markdown);
        setPhase("done");

        trackConversionSucceeded(TOOL, {
          pages: result.stats.pages,
          characters: result.stats.characters,
          tables: result.stats.tables,
          headings: result.stats.headings,
          duration_ms: Math.round(performance.now() - startedAt),
          empty_result: result.markdown === "",
        });
      } catch (cause) {
        const code =
          cause instanceof PdfExtractionError ? cause.code : "unknown";
        setError(
          cause instanceof PdfExtractionError
            ? cause.message
            : `Something went wrong converting that file: ${(cause as Error).message}`,
        );
        setPhase("error");
        trackConversionFailed(TOOL, code);
      }
    } catch (cause) {
      setError(
        `The converter couldn't load (${(cause as Error).message}). Check your connection and reload the page.`,
      );
      setPhase("error");
      trackConversionFailed(TOOL, "module_load_failed");
    }
  };

  const busy = phase === "reading" || phase === "converting";
  const hasOutput = phase === "done" && markdown !== "";

  const statusMessage = (() => {
    switch (phase) {
      case "reading":
        return progress > 0
          ? `Reading ${fileName} — ${Math.round(progress)}% of pages`
          : `Opening ${fileName}…`;
      case "converting":
        return "Converting layout to Markdown…";
      case "done":
        return outcome && outcome.markdown === ""
          ? `No text could be extracted from ${fileName}.`
          : `Converted ${fileName} — ${outcome?.stats.pages ?? 0} page${outcome?.stats.pages === 1 ? "" : "s"}.`;
      case "error":
        return "Conversion stopped.";
      default:
        return "Everything runs in this tab — your PDF is never uploaded.";
    }
  })();

  const download = () => {
    downloadBlob(
      new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
      `${baseName(fileName, "converted")}.md`,
    );
    trackOutputDownloaded(TOOL, { characters: markdown.length });
  };

  return (
    <ToolShell>
      <div className="space-y-5">
        {phase === "idle" || phase === "error" ? (
          <Dropzone
            accept="application/pdf,.pdf"
            constraints="PDF up to 25 MB, 500 pages"
            label="Choose a PDF to convert"
            disabled={busy}
            onFile={convert}
          />
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
            <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{fileName}</span>
            <ResetButton onClick={reset} disabled={busy} />
          </div>
        )}

        <StatusLine
          busy={busy}
          message={statusMessage}
          percent={phase === "reading" ? progress : undefined}
        />

        {error !== "" && <ErrorBanner message={error} onRetry={reset} />}

        {outcome && <WarningList warnings={outcome.warnings} />}

        {phase === "done" && (
          <div className="space-y-3">
            <PanelHeading
              htmlFor="pdf-markdown-output"
              hint="Editable — fix anything the layout guessed wrong"
            >
              Markdown output
            </PanelHeading>

            <textarea
              id="pdf-markdown-output"
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              spellCheck={false}
              rows={16}
              placeholder="No text was extracted from this PDF."
              className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            {outcome && (
              <StatChips
                items={[
                  { label: "pages", value: outcome.stats.pages },
                  { label: "headings", value: outcome.stats.headings },
                  { label: "paragraphs", value: outcome.stats.paragraphs },
                  { label: "list items", value: outcome.stats.listItems },
                  { label: "tables", value: outcome.stats.tables },
                  { label: "code blocks", value: outcome.stats.codeBlocks },
                  { label: "links", value: outcome.stats.links },
                ]}
              />
            )}

            <div className="flex flex-wrap gap-2">
              <PrimaryAction onClick={download} disabled={!hasOutput}>
                <DownloadIcon /> Download .md
              </PrimaryAction>
              <CopyButton
                text={markdown}
                disabled={!hasOutput}
                onCopied={() => trackOutputCopied(TOOL, { characters: markdown.length })}
              />
              <ResetButton onClick={reset} />
            </div>

            {hasOutput && <ProductCta tool={TOOL} context="after_conversion" />}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
