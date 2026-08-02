/**
 * GA4 event helpers for the /tools/* converters.
 *
 * Events are pushed to window.dataLayer so they queue correctly even if the
 * gtag script hasn't finished loading yet (or was never loaded because
 * PUBLIC_GA_ID is unset — in that case they simply accumulate and are never
 * sent, which is the intended no-op).
 *
 * In dev, events are logged to the console only; no network calls.
 * Mirrors homeloom.app/src/analytics/ga.ts.
 */

export type ToolId = "pdf-to-markdown" | "markdown-to-docx";

/** Every event this site emits. Kept as a union so typos fail typecheck. */
export type ToolEvent =
  | "tool_view"
  | "file_selected"
  | "conversion_started"
  | "conversion_succeeded"
  | "conversion_failed"
  | "output_copied"
  | "output_downloaded"
  | "product_cta_clicked";

type EventParams = Record<string, string | number | boolean>;

interface GaWindow {
  dataLayer?: unknown[];
}

function pushEvent(eventName: ToolEvent, params: EventParams): void {
  if (typeof window === "undefined") return;

  if (import.meta.env.DEV) {
    console.log(`[GA] ${eventName}`, params);
    return;
  }

  const win = window as unknown as GaWindow;
  win.dataLayer = win.dataLayer ?? [];
  win.dataLayer.push(["event", eventName, params]);
}

/**
 * Emit a tool event. `tool` is always attached so the two converters can be
 * segmented in GA without separate event names.
 */
export function trackToolEvent(
  event: ToolEvent,
  tool: ToolId,
  params: EventParams = {},
): void {
  pushEvent(event, {
    tool,
    page_path: typeof window === "undefined" ? "" : window.location.pathname,
    ...params,
  });
}

/** Fired once per page, on mount of the tool island. */
export function trackToolView(tool: ToolId): void {
  trackToolEvent("tool_view", tool);
}

/** A file was chosen via drop or picker. Size is bucketed, never the filename. */
export function trackFileSelected(
  tool: ToolId,
  info: { sizeBytes: number; mimeType: string; source: "drop" | "picker" },
): void {
  trackToolEvent("file_selected", tool, {
    size_kb: Math.round(info.sizeBytes / 1024),
    mime_type: info.mimeType,
    source: info.source,
  });
}

export function trackConversionStarted(tool: ToolId, params: EventParams = {}): void {
  trackToolEvent("conversion_started", tool, params);
}

export function trackConversionSucceeded(
  tool: ToolId,
  params: EventParams = {},
): void {
  trackToolEvent("conversion_succeeded", tool, params);
}

/** `reason` is a stable machine code (see ConversionErrorCode), not raw text. */
export function trackConversionFailed(
  tool: ToolId,
  reason: string,
  params: EventParams = {},
): void {
  trackToolEvent("conversion_failed", tool, { reason, ...params });
}

export function trackOutputCopied(tool: ToolId, params: EventParams = {}): void {
  trackToolEvent("output_copied", tool, params);
}

export function trackOutputDownloaded(
  tool: ToolId,
  params: EventParams = {},
): void {
  trackToolEvent("output_downloaded", tool, params);
}

export function trackProductCtaClicked(tool: ToolId, location: string): void {
  trackToolEvent("product_cta_clicked", tool, { cta_location: location });
}
