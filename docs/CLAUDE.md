# CLAUDE.md — mdburst.com

Per-project orientation for Claude. Read this first when picking up
work on this site. Index of conventions, deferred decisions, and
non-features that aren't obvious from the code or git history.

## Project

mdburst.com turns one Markdown draft into platform-ready blog posts,
newsletters, LinkedIn posts and social threads, for markdown-first
creators who publish the same idea to several channels every week. The
site is currently a marketing landing page plus three free, fully
client-side converter pages under `/tools/` that act as SEO entry
points; the product itself is not built yet.

Stack: Astro 5 (`output: 'static'`) with React 19 islands, Tailwind v4,
pnpm, deployed to Cloudflare Workers Static Assets. The `Makefile`
forwards to `../Makefile` and on to the central builder.

## Commands

```bash
# Build / dev (forwards to the parent Makefile)
make deps           # install deps via the central builder
make run            # local dev server  (NOT `make dev` — no such target)
make build          # production build → dist/

# Test — hard-fails outside docker; `make buildsh` from sites/ first
make test           # pnpm install + build + test

# Deploy
git push            # Cloudflare auto-builds on push to main
```

The Bash tool runs on the host, not in the container. To run a target
directly from a Claude session, exec into the running `sites1` container:

```bash
docker ps                                           # find its name
docker exec -w /usr/src/app/mdburst.com <name> \
  sh -c 'PATH=/root/.volta/bin:$PATH pnpm test'     # node/pnpm live under volta
```

Inside the container the pnpm scripts are `dev`, `build`, `test`, and
`typecheck` (`astro check`).

## Conventions

  - Build path: this project's `Makefile` → `../Makefile` (parent
    workspace) → `~/work/projects/builder/` (central builder).
  - Stack: pnpm-only. No `package-lock.json` / `bun.lockb` / `yarn.lock`.
  - Deploy: Cloudflare Pages via `wrangler.jsonc`. No `_redirects`
    SPA fallback (uses CF's `not_found_handling` instead).

## Heading hygiene

**Before adding any section, subsection, or heading to a Markdown
file, output the file's current heading outline first:**

```bash
grep -nE '^#+ ' path/to/file.md
```

Then confirm — in the chat — that the planned new heading's:

1. **Depth** (`#`, `##`, `###`, …) is the intended depth, not
   accidentally one level too shallow.
2. **Label** doesn't collide with existing headings — no duplicate
   `## 1. <title>`, no `### N.X` subsection labels that look like
   `vN.X` phase identifiers.

Only after that confirmation, write.

Applies especially to long-lived docs: `docs/prd.md`, `AI_AGENTS.md`,
`docs/architecture.md`, `docs/CLAUDE.md`.

**Why:** structural drift is invisible in any single editing session
— it only becomes obvious in the aggregate, by which time the doc is
hard to fix. The pre-edit outline ritual catches collisions and depth
mistakes at the point of writing, not at quarterly cleanup time.

## Deferred decisions

*Things deliberately not shipped. Append entries with rationale so
future sessions don't re-propose them.*

- **No ESLint (2026-08-02).** The repo has never had a linter. Adding one
  is a toolchain decision with config and CI implications that belongs to
  the operator, not to a feature branch. `astro check` covers type
  diagnostics in the meantime. Don't add ESLint without being asked.
- **TypeScript pinned to 6.x (2026-08-02).** Not staleness — `astro check`
  cannot run on TypeScript 7, which dropped the programmatic API the
  language server uses. Do not "upgrade" it until
  <https://github.com/withastro/roadmap/discussions/1321> resolves.
- **No DOMPurify (2026-08-02).** The Markdown preview sanitizes with a
  small allowlist in `src/lib/sanitize-html.ts` instead. The surface is
  fixed and directly tested, and the risk is self-XSS only (the user's own
  input, their own tab, no credentials on a static site). Revisit only if
  the preview starts rendering content from a third party.
- **No OCR in the PDF converter (2026-08-02).** Scanned PDFs return empty
  with an explicit warning. Bundling Tesseract would add megabytes to a
  page whose selling point is that it loads fast and runs locally, to
  serve a case the user can handle upstream. The limitation is stated
  plainly on the page rather than papered over.
- **Images are placeholders in Markdown → DOCX (2026-08-02).** Embedding
  a remote image requires fetching it, which would break the "nothing
  leaves your browser" guarantee that the page makes. Alt text is
  preserved instead. This is a deliberate trade, not a gap to fill.
- **Bold/italic not detected in PDF → Markdown (2026-08-02).** Emphasis in
  a PDF is a separate embedded font, not a style flag; inferring it across
  arbitrary font-naming conventions produced more false positives than it
  was worth. A `Line.bold` field existed briefly and was removed as dead
  code — don't reintroduce it speculatively.
- **No server-side rendering (inherited).** `output: 'static'`. See
  `src/lib/server-todo.md` for what was dropped in the TanStack port and
  what re-adding an adapter would involve.
