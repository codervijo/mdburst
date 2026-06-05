# Dropped server code (TanStack Start → Astro static)

The source (`genai/`) was a TanStack Start app with a server runtime. Astro
here is configured for `output: 'static'`, so the server-side pieces below do
**not** translate and were intentionally dropped during the port. The landing
page is fully static + client islands, so none of this is needed to ship the
marketing site. If server behavior is ever required, re-introduce it via an
Astro adapter (e.g. `@astrojs/cloudflare`) + endpoints / middleware.

## Dropped

- **TODO:** `genai/src/server.ts` — Cloudflare Worker `fetch` entry that
  delegated to the TanStack Start server-entry module and normalized catastrophic
  SSR 500s into a rendered error page. No equivalent in static output.
- **TODO:** `genai/src/start.ts` — TanStack Start runtime bootstrap.
- **TODO:** `genai/src/router.tsx` + `genai/src/routeTree.gen.ts` — TanStack
  Router setup with a QueryClient context. Replaced by Astro file-based routing
  (`src/pages/`).
- **TODO:** `genai/src/routes/__root.tsx` — root route shell (html/head/body,
  `<HeadContent/>`, `<Scripts/>`, QueryClientProvider, 404 + error boundaries).
  Chrome ported to `src/layouts/Layout.astro`; meta ported to
  `src/pages/index.astro`. The runtime 404/error boundary components are not
  ported (static host serves its own 404).
- **TODO:** `genai/src/lib/api/example.functions.ts` — `createServerFn` example
  (`getGreeting`). Server functions need a server runtime; re-add as an Astro
  endpoint (`src/pages/api/*.ts`) under an SSR adapter if needed.
- **TODO:** `genai/src/lib/config.server.ts` — server-only env config helper.
- **TODO:** `genai/src/lib/error-capture.ts`, `error-page.ts`,
  `lovable-error-reporting.ts` — SSR error capture/reporting plumbing tied to
  the Worker entry. Not applicable to static output.

## Ported

- Landing UI (`routes/index.tsx` body) → `src/components/LandingPage.tsx`
  (mounted as a `client:load` island in `src/pages/index.astro`).
- Landing components → `src/components/landing/*`.
- `src/components/ui/button.tsx`, `src/lib/utils.ts`, `src/hooks/use-reveal.ts`.
- `src/styles.css` → `src/styles/global.css`.
- `<head>` meta from `routes/index.tsx` + `__root.tsx` → `src/pages/index.astro`.
