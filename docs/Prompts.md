# Prompt History — mdburst.com

<!-- Append new prompts at the bottom, newest last. Format:

## YYYY-MM-DD [optional title]
> <prompt text or short summary>

The dated H2 (`## YYYY-MM-DD`) is what `portfolio project check` parses
to surface "last AI prompt" per project. Keep entries append-only.
-->

## 2026-06-05 — scaffolded via portfolio new bootstrap

> Created project skeleton. Stack chosen, scaffolding written, git initialized.

## 2026-08-02 — v1.A: two SEO tool pages, then a hub

> "Inspect the existing mdburst.com codebase and implement two production-ready
> SEO tools": `/tools/pdf-to-markdown/` (kw "PDF to Markdown", SV 2.8K, KD 3)
> and `/tools/markdown-to-docx/` (kw "Markdown to DOCX", SV 450, KD 5). Full
> spec covering tool behaviour, SEO requirements (schema, breadcrumbs, 600+
> words, FAQ), UX, analytics events, and tests. Follow-up prompt in the same
> session: turn `/tools/` into a real topical hub rather than a directory.

Outcome: shipped as `v1.A`. Three deps added (`pdfjs-dist`, `docx`, `marked`),
all dynamically imported so nothing heavy is in first paint. Conversion is
entirely client-side — no upload endpoint exists, which is what makes the
privacy copy true by construction.

Notes worth keeping:

- Running a **real** PDF through the pipeline caught three bugs the synthetic
  fixtures missed. The important one: most PDF generators separate table
  columns with a wide *space item*, not a coordinate gap, so the original
  cell-splitting logic collapsed every table row into one cell. Unit tests over
  hand-built page models could never have caught it — hence the round-trip test
  in `src/__tests__/pdf-roundtrip.test.js`.
- `pdf.js` leaves `commonObjs` empty unless `getOperatorList()` runs, so font
  names arrive as internal ids (`g_d0_f5`). Resolved via `textContent.styles`
  instead, which is free.
- TypeScript is pinned to **6.x deliberately**: `astro check` cannot run on 7.x,
  which dropped the programmatic API it needs.
- No linter was added. The repo has none, and adopting ESLint is a toolchain
  decision left to the operator.
