/**
 * GA4 loader. Reads the measurement ID from PUBLIC_GA_ID (Astro's client-exposed
 * env prefix), falling back to VITE_GA_ID for parity with the sibling sites that
 * were scaffolded as Vite/React apps. Only initializes when a real ID is present:
 * if the var is missing, blank, still a raw placeholder, or the .env.example
 * sample value, this no-ops — no gtag script is loaded and nothing touches the
 * DOM. Failing silent-and-clean beats firing GA with a garbage ID.
 *
 * Mirrors homeloom.app/src/analytics/init.ts; kept as its own copy because the
 * sites/* projects are independent repos with no shared package.
 */

interface GaWindow {
  dataLayer?: unknown[];
}

function readGaId(): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  return (env.PUBLIC_GA_ID ?? env.VITE_GA_ID)?.trim();
}

export function initAnalytics(): void {
  // Never run during static prerender — no window/document there.
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const gaId = readGaId();

  // No usable ID: undefined/blank, an unsubstituted "%PUBLIC_GA_ID%"
  // placeholder, or the documentation sample from .env.example.
  if (!gaId || gaId.startsWith("%") || gaId === "G-XXXXXXXXXX") return;

  // Don't run GA in local dev (mirrors the event helper in ./ga.ts).
  if (import.meta.env.DEV) return;

  // Already initialized by an earlier island on the same page.
  if (document.querySelector('script[data-mdburst-ga="1"]')) return;

  const win = window as unknown as GaWindow;
  win.dataLayer = win.dataLayer ?? [];
  const gtag = (...args: unknown[]): void => {
    win.dataLayer!.push(args);
  };
  gtag("js", new Date());
  gtag("config", gaId);

  const script = document.createElement("script");
  script.async = true;
  script.dataset.mdburstGa = "1";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  document.head.appendChild(script);
}
