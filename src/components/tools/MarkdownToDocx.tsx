/**
 * Markdown to DOCX converter island.
 *
 * Editor on the left, live preview on the right, one button that builds a real
 * .docx and saves it. The `docx` builder and `marked` are dynamically imported
 * on first use so the initial page payload stays small; the preview loads its
 * (much smaller) renderer as soon as the user starts typing.
 */

import * as React from "react";
import {
  CopyButton,
  DownloadIcon,
  ErrorBanner,
  PanelHeading,
  PrimaryAction,
  ProductCta,
  ResetButton,
  SecondaryAction,
  StatChips,
  StatusLine,
  ToolShell,
} from "./toolkit";
import {
  trackConversionFailed,
  trackConversionStarted,
  trackConversionSucceeded,
  trackOutputCopied,
  trackOutputDownloaded,
  trackToolView,
} from "../../analytics/ga";
import { initAnalytics } from "../../analytics/init";
import type { DocxStats } from "../../lib/markdown-to-docx";

const TOOL = "markdown-to-docx" as const;

const SAMPLE = `# Quarterly Update

A short **example** so you can see how each element lands in Word.

## What changed

- Real Word headings, not bold text
- Nested lists
  - like this one
- Task lists

1. Ordered items keep their numbering
2. Across levels

> Blockquotes become an indented, ruled paragraph.

| Element | Word equivalent |
| --- | --- |
| Heading | Heading 1–6 style |
| Table | Native table |
| Code | Monospaced, shaded |

\`\`\`js
const doc = convert(markdown);
\`\`\`

See the [PDF to Markdown converter](/tools/pdf-to-markdown/) for the other direction.

---

*Italic*, **bold**, ~~strikethrough~~ and \`inline code\` all carry across.
`;

type Phase = "idle" | "converting" | "done" | "error";

export default function MarkdownToDocx() {
  const [markdown, setMarkdown] = React.useState("");
  const [preview, setPreview] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [error, setError] = React.useState("");
  const [stats, setStats] = React.useState<DocxStats | null>(null);

  React.useEffect(() => {
    initAnalytics();
    trackToolView(TOOL);
  }, []);

  // Debounced live preview. Rendering on every keystroke is wasteful on long
  // documents and makes typing feel heavy on mobile.
  React.useEffect(() => {
    if (markdown.trim() === "") {
      setPreview("");
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { renderMarkdownPreview } = await import("../../lib/markdown-preview");
      if (!cancelled) setPreview(renderMarkdownPreview(markdown));
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [markdown]);

  const reset = () => {
    setMarkdown("");
    setPreview("");
    setPhase("idle");
    setError("");
    setStats(null);
  };

  const convert = async () => {
    setError("");
    setPhase("converting");
    const startedAt = performance.now();
    trackConversionStarted(TOOL, { characters: markdown.length });

    try {
      const { markdownToDocxBlob, MarkdownConversionError } = await import(
        "../../lib/markdown-to-docx"
      );

      try {
        const { blob, stats: result } = await markdownToDocxBlob(markdown);
        const { downloadBlob } = await import("./toolkit");
        downloadBlob(blob, "document.docx");

        setStats(result);
        setPhase("done");
        trackConversionSucceeded(TOOL, {
          characters: markdown.length,
          headings: result.headings,
          tables: result.tables,
          list_items: result.listItems,
          duration_ms: Math.round(performance.now() - startedAt),
        });
        trackOutputDownloaded(TOOL, { format: "docx", bytes: blob.size });
      } catch (cause) {
        const code =
          cause instanceof MarkdownConversionError ? cause.code : "unknown";
        setError(
          cause instanceof MarkdownConversionError
            ? cause.message
            : `The document couldn't be built: ${(cause as Error).message}`,
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

  const busy = phase === "converting";
  const empty = markdown.trim() === "";

  const statusMessage = (() => {
    if (busy) return "Building your Word document…";
    if (phase === "done") return "Saved to your downloads as document.docx.";
    if (phase === "error") return "Conversion stopped.";
    if (empty) return "Everything runs in this tab — your text is never uploaded.";
    const words = markdown.trim().split(/\s+/).length;
    return `${words.toLocaleString()} words ready to convert.`;
  })();

  return (
    <ToolShell>
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <PanelHeading htmlFor="markdown-input" hint="Paste or type">
              Markdown
            </PanelHeading>
            <textarea
              id="markdown-input"
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              spellCheck={false}
              rows={18}
              placeholder="# Your heading&#10;&#10;Paste your Markdown here, or load the example below."
              className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div>
            <PanelHeading hint="How the structure will map">Live preview</PanelHeading>
            <div
              aria-live="polite"
              aria-label="Rendered Markdown preview"
              className="markdown-preview h-[28rem] w-full overflow-auto rounded-xl border border-border bg-background p-4 text-sm"
            >
              {preview === "" ? (
                <p className="text-xs text-muted-foreground">
                  The rendered preview appears here as you type.
                </p>
              ) : (
                // Sanitized by renderMarkdownPreview via the allowlist in
                // src/lib/sanitize-html.ts before it ever reaches this point.
                <div dangerouslySetInnerHTML={{ __html: preview }} />
              )}
            </div>
          </div>
        </div>

        <StatusLine busy={busy} message={statusMessage} />

        {error !== "" && <ErrorBanner message={error} />}

        <div className="flex flex-wrap gap-2">
          <PrimaryAction onClick={convert} disabled={busy || empty}>
            <DownloadIcon /> Convert and download .docx
          </PrimaryAction>
          <SecondaryAction onClick={() => setMarkdown(SAMPLE)} disabled={busy}>
            Load example
          </SecondaryAction>
          <CopyButton
            text={markdown}
            disabled={empty}
            onCopied={() => trackOutputCopied(TOOL, { characters: markdown.length })}
          />
          <ResetButton onClick={reset} disabled={busy || empty} />
        </div>

        {stats && (
          <StatChips
            items={[
              { label: "headings", value: stats.headings },
              { label: "paragraphs", value: stats.paragraphs },
              { label: "list items", value: stats.listItems },
              { label: "tables", value: stats.tables },
              { label: "code blocks", value: stats.codeBlocks },
              { label: "blockquotes", value: stats.blockquotes },
              { label: "links", value: stats.links },
            ]}
          />
        )}

        {phase === "done" && <ProductCta tool={TOOL} context="after_conversion" />}
      </div>
    </ToolShell>
  );
}
