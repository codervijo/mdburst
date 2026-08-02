/**
 * Shared UI primitives for the /tools/* converter islands.
 *
 * Both converters have the same skeleton — input surface, status line, output
 * surface, copy/download/reset, product CTA — so the pieces live here and each
 * tool supplies only its own logic. Keeps the two pages visually identical
 * without either importing the other.
 *
 * Accessibility notes: the dropzone is a real <button> wrapping a visually
 * hidden <input type="file">, so keyboard and screen-reader users get the
 * native picker; drag-and-drop is an enhancement layered on top. Status changes
 * are announced through an aria-live region rather than only shown visually.
 */

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  Download,
  Info,
  Loader2,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { trackProductCtaClicked, type ToolId } from "../../analytics/ga";

/* ------------------------------------------------------------------ layout */

export function ToolShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      {children}
    </div>
  );
}

export function PanelHeading({
  children,
  htmlFor,
  hint,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  hint?: string;
}) {
  const Tag = htmlFor ? "label" : "div";
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
      <Tag
        {...(htmlFor ? { htmlFor } : {})}
        className="text-sm font-medium text-foreground"
      >
        {children}
      </Tag>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

/* --------------------------------------------------------------- dropzone */

export interface DropzoneProps {
  /** Value for the file input's accept attribute. */
  accept: string;
  /** Human-readable constraint line, e.g. "PDF up to 25 MB". */
  constraints: string;
  label: string;
  disabled?: boolean;
  onFile: (file: File, source: "drop" | "picker") => void;
}

export function Dropzone({
  accept,
  constraints,
  label,
  disabled = false,
  onFile,
}: DropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file, "drop");
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          dragging
            ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]"
            : "border-border bg-background hover:border-foreground/30 hover:bg-muted/50",
        )}
      >
        <span
          aria-hidden="true"
          className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground"
        >
          <UploadCloud className="h-5 w-5" />
        </span>
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          Drag and drop, or press to browse — {constraints}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label={label}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file, "picker");
          // Reset so selecting the same file twice re-fires onChange.
          event.target.value = "";
        }}
      />
    </div>
  );
}

/* ----------------------------------------------------------------- status */

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-[color-mix(in_oklab,var(--destructive)_35%,transparent)] bg-[color-mix(in_oklab,var(--destructive)_8%,transparent)] p-4"
    >
      <AlertTriangle
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--destructive)]"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground/90">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 cursor-pointer text-xs font-medium underline underline-offset-4 hover:text-foreground"
          >
            Start over
          </button>
        )}
      </div>
    </div>
  );
}

export function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <ul className="space-y-2">
      {warnings.map((warning) => (
        <li
          key={warning}
          className="flex items-start gap-3 rounded-xl border border-[color-mix(in_oklab,var(--warning)_40%,transparent)] bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] p-3"
        >
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
          <span className="text-xs text-foreground/85">{warning}</span>
        </li>
      ))}
    </ul>
  );
}

/** Progress line. Announced politely so screen readers hear the state change. */
export function StatusLine({
  busy,
  message,
  percent,
}: {
  busy: boolean;
  message: string;
  percent?: number;
}) {
  return (
    <div className="space-y-2">
      <p
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        {busy && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}
        {message}
      </p>
      {busy && percent !== undefined && (
        <div
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Conversion progress"
          className="h-1 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200"
            style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
          />
        </div>
      )}
    </div>
  );
}

/** Summary chips describing what the conversion produced. */
export function StatChips({ items }: { items: { label: string; value: number }[] }) {
  const visible = items.filter((item) => item.value > 0);
  if (visible.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {visible.map((item) => (
        <li
          key={item.label}
          className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground"
        >
          <span className="font-medium text-foreground">{item.value}</span> {item.label}
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- actions */

const actionClass =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function PrimaryAction(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={cn(actionClass, "bg-primary text-primary-foreground hover:bg-primary/90", className)}
    />
  );
}

export function SecondaryAction(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={cn(actionClass, "border border-border bg-background hover:bg-muted", className)}
    />
  );
}

/** Copy-to-clipboard button that confirms inline for two seconds. */
export function CopyButton({
  text,
  disabled,
  onCopied,
}: {
  text: string;
  disabled?: boolean;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Firefox without clipboard permission, or a non-secure context.
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    onCopied?.();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SecondaryAction onClick={copy} disabled={disabled} aria-live="polite">
      {copied ? (
        <>
          <Check aria-hidden="true" className="h-3.5 w-3.5" /> Copied
        </>
      ) : (
        <>
          <Copy aria-hidden="true" className="h-3.5 w-3.5" /> Copy
        </>
      )}
    </SecondaryAction>
  );
}

export function ResetButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <SecondaryAction onClick={onClick} disabled={disabled}>
      <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Clear
    </SecondaryAction>
  );
}

export function DownloadIcon() {
  return <Download aria-hidden="true" className="h-3.5 w-3.5" />;
}

/** Trigger a browser download for a Blob, cleaning up the object URL after. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking synchronously can cancel the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Strip the extension and sanitize a filename for reuse as an output name. */
export function baseName(fileName: string, fallback: string): string {
  const stem = fileName.replace(/\.[^.]+$/, "").trim();
  const safe = stem.replace(/[^\w\-. ]+/g, "").trim();
  return safe === "" ? fallback : safe;
}

/* -------------------------------------------------------------- product CTA */

/**
 * Post-conversion nudge toward the product. Deliberately placed *after* a
 * successful result and never as a gate — the converter is fully usable
 * without it, which is both the promise on the page and what keeps the page
 * useful as an SEO entry point.
 */
export function ProductCta({ tool, context }: { tool: ToolId; context: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-[color-mix(in_oklab,var(--accent)_6%,transparent)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-foreground/85">
        Converting one file at a time? mdburst turns a single Markdown draft into
        publish-ready posts for your blog, newsletter, LinkedIn and social threads.
      </p>
      <a
        href="/#waitlist"
        onClick={() => trackProductCtaClicked(tool, context)}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
      >
        Join the waitlist <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
