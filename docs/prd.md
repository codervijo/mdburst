---
project: mdburst.com
prd_version: 1
project_version: v1.A
status: shipped
owner: Vijo
last_updated: 2026-08-02
---

# mdburst.com — PRD

## 1. Problem

Creators who publish the same idea to more than one channel reformat it by
hand every time: the blog wants one thing, the newsletter another, LinkedIn
mangles spacing on paste, and threads need manual splitting. The work is
repetitive, weekly, and adds no value — but skipping it produces visibly
broken posts. Adjacent to it sits a second, smaller version of the same
problem: content arrives in a format you cannot edit (a PDF) or has to leave
in one you do not write in (Word).

## 2. Users

Markdown-first creators: indie bloggers, technical founders, devrel writers,
newsletter operators, and small agencies. The sharpest subset — the ICP — is
the weekly publisher who already writes in Markdown and distributes every post
to at least three places. They feel the pain on a schedule, value workflow
speed over content generation, and will pay for formatting reliability and
preview accuracy. Full ICP statement lives in `AI_AGENTS.md` and in
`lamill.toml`'s `[content]` block.

## 3. Goals & non-goals

**Goals:**
- Validate that creators will pay to eliminate manual reformatting and
  multi-channel publishing busywork.
- Convert one Markdown draft into Ghost- and Buffer-ready outputs with
  previews that match what actually publishes.
- Earn organic search entry points by shipping genuinely useful free tools
  around the same problem space, then convert that traffic to the waitlist.

**Non-goals:**
- Writing or generating content. mdburst moves and formats what you wrote;
  it is not an AI writing tool, and the ICP actively dislikes those.
- Being a general-purpose document converter. The free tools exist to serve
  the publishing workflow and to attract the right audience, not to chase
  every conversion pair.
- Perfect-fidelity conversion. Both shipped converters infer structure and
  say so plainly rather than overclaiming.

## 4. Versions

Two-level versioning convention (canonical: `sites/portfolio/AI_AGENTS.md`):

- `vN` = major capability tier; SemVer-MAJOR semantics.
- `vN.X` = phase letter within a tier; internal slicing.

| Version | Theme | Acceptance |
|---|---|---|
| v0 | scaffold + marketing site | local builds, CF `wrangler.jsonc` + `public/_headers` in place, repo initialized, landing page live |
| v1 | free browser-based Markdown tools as SEO entry points | indexable tool pages that do real work client-side, cross-linked to the product, emitting analytics |
| v2 | the product itself — one draft, many channels | *(not started; needs operator signal)* |

## 5. Phases

| Phase | Theme | Features | Status |
|---|---|---|---|
| **v0.A** | scaffolded | `portfolio new bootstrap` ran; standard files written; git initialized | ✅ |
| **v0.B** | Astro port + landing | tanstack-start → Astro static port; landing page as React islands; SEO baseline (`robots.txt`, `@astrojs/sitemap`, IndexNow key) | ✅ |
| **v1.A** | free `/tools/` converters | PDF to Markdown and Markdown to DOCX, both fully client-side; `/tools/` topical hub; per-page SEO metadata + BreadcrumbList / WebApplication / FAQPage schema; GA4 analytics module; `tsconfig.json` + `typecheck`; 196 tests | ✅ |

## 6. Open questions

*(append-only log; mark answered with date but never delete)*

- **2026-08-02** — v1.A's in-browser runtime path is unverified: no browser was
  driven against the built pages, so pdf.js worker startup and the `.docx`
  download trigger are untested outside Node. Needs one manual pass before the
  tools can be considered proven.
- **2026-08-02** — GSC is still unverified for `sc-domain:mdburst.com` (see the
  post-deploy checklist in `AI_AGENTS.md` and the open todos in `lamill.toml`).
  Until it is, no phase on this project can be evaluated against search data,
  including v1.A.
- **2026-08-02** — v1 shipped two converters because they map to real keywords
  with low difficulty. Whether to add a third (and which) should come from GSC
  data once it exists, not from guessing.
