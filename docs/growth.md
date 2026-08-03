# Growth Log — mdburst.com

> **What this file is for:** an honest, append-only log of growth experiments
> on this site — what was tried, what was measured, what happened. The data
> source is GSC; this file narrates *why*. Future-you (or future-Claude)
> reads this when deciding what to try next, both on this site and on
> related sister sites.

## How to use this (workflow — re-read this when you forget)

**Add an entry whenever you do something growth-relevant.** That includes:
shipping new content, structural SEO changes (sitemap, schema, redirects,
internal linking), tech changes that affect crawl/indexing, marketing
pushes, backlink campaigns. *Not* every code commit — just things you'd
want to point at when GSC numbers move (or fail to).

**Each entry is a hypothesis you can be wrong about.** Commit to a
measurable KPI and an observation window before acting — otherwise "did
this work?" is just a feeling.

### Lifecycle of one entry

1. **Day of action** — append a new dated H2 with `Status: active`, the
   hypothesis, the KPI you'll watch, current baseline numbers, what you
   did, and the date to review (default: today + 28 days, matching GSC's
   reporting window).
2. **Review day** — pull current GSC numbers, compute delta vs baseline.
   Fill in **Result** and **Learning**. Set **Status** to `shipped` (worked,
   keep going), `failed` (didn't pay off, abandon), or extend the review
   another window if results are ambiguous.
3. **Never rewrite older entries.** Wrong hypotheses are the most valuable
   data — they tell you what NOT to repeat on the next site. Append, don't
   edit.

### Where to get the numbers

```bash
cd ~/work/projects/sites/portfolio && make run ARGS="gsc sync"
```

Then read the row for `mdburst.com`. Or pull from
https://search.google.com/search-console directly.

### Format

```
## YYYY-MM-DD — <one-line hypothesis or action>
- **Status:** active | testing | shipped | failed | abandoned
- **Hypothesis:** <what you're betting will work — only on initial / new-bet entries>
- **KPI:** <what GSC metric / query / page>
- **Baseline:** <numbers at start>
- **Action:** <what was done; 1-2 lines>
- **Result:** <numbers after window; "TBD — review YYYY-MM-DD" until then>
- **Learning:** <why it worked / didn't; what to try next; "TBD" until reviewed>
```

---

## 2026-06-05 — Creators who publish consistently across multiple channels have…
- **Status:** active
- **Hypothesis:** Creators who publish consistently across multiple channels have recurring formatting pain and gather in visible communities around Obsidian, Ghost, Buttondown, Substack, indie blogging, and devrel. A free markdown preview/converter can attract high-intent users, while Ghost + Buffer publishing, templates, scheduling, and team workflows create the paid upgrade path.
- **KPI:** any GSC traffic — clicks, impressions, indexed-page count
- **Baseline:** 0 clicks / 0 impressions (just deployed)
- **Action:** project scaffolded via `portfolio new bootstrap`; first deploy pending. After deploy: verify in GSC as `sc-domain:mdburst.com` and submit the sitemap.
- **Result:** Review deferred at 2026-08-02. Not measurable: the GSC property for `sc-domain:mdburst.com` has still not been verified, so there is no clicks/impressions data to compare against — no numbers are recorded here rather than assuming zero. The `lamill.toml` todos for GSC verification and sitemap submission are both still `open`. Two structural blockers were also found and fixed after this entry was written: `public/sitemap.xml` was a hand-written stub shadowing the `@astrojs/sitemap` index (fixed 922e09a), and the IndexNow key file was untracked so it never deployed (fixed 273139e).
- **Learning:** The hypothesis is still untested — this measured nothing about the market, only that the measurement pipeline was never connected. Verifying GSC is a hard prerequisite for every subsequent entry on this site, including the 2026-08-02 one below. Worth carrying to sister sites: confirm the property is verified and the sitemap is accepted *before* logging a baseline, otherwise the review date arrives with nothing to read.

## 2026-08-02 — Free client-side converters as low-KD search entry points
- **Status:** active
- **Hypothesis:** The people who need a PDF-to-Markdown or Markdown-to-Word converter are, disproportionately, markdown-first publishers — the same ICP mdburst sells to. Shipping genuinely useful free tools against low-difficulty keywords should attract them at the moment they are feeling an adjacent version of the problem mdburst solves, at a fraction of the cost of ranking for the head term "markdown publishing workflow".
- **KPI:** GSC clicks and impressions for "PDF to Markdown", "Convert PDF to Markdown" and "Markdown to DOCX"; indexed-page count for the three `/tools/*` URLs; and the `product_cta_clicked` GA4 event as the conversion signal from tool user → waitlist.
- **Baseline:** None recorded. GSC is not yet verified for this property (see the 2026-06-05 entry), so there is no search data to baseline against. GA4 is also unset — `PUBLIC_GA_ID` has no value in the Cloudflare environment yet, so the analytics module no-ops. Both must be connected before this entry can be reviewed.
- **Action:** Shipped `v1.A` — three new indexable pages: `/tools/pdf-to-markdown/`, `/tools/markdown-to-docx/`, and a `/tools/` topical hub. Copy is server-rendered (only the converter widget hydrates), 1584 / 1311 / 1198 words respectively. Each page carries a unique title and meta description, canonical, OG + Twitter tags, visible breadcrumbs with matching BreadcrumbList, WebApplication or ItemList, and FAQPage generated from the same array the visible FAQ renders from. All three are in `sitemap-0.xml`. Internal links run both ways between the tools, the hub, and the landing page. Chose targets on keyword difficulty: "PDF to Markdown" (SV 2.8K, KD 3) is the volume play, "Markdown to DOCX" (SV 450, KD 5) the qualifier.
- **Result:** TBD — review 2026-08-30
- **Learning:** TBD

**Prerequisites before the review date is meaningful:**

1. Verify `sc-domain:mdburst.com` in GSC and submit `sitemap-index.xml`.
2. Set `PUBLIC_GA_ID` in the Cloudflare project so the eight tool events actually record.
3. Confirm the tools work in a real browser — the in-browser path (pdf.js worker startup, `.docx` download) has not been exercised outside Node, and a tool that fails on load will read as "no demand" in the data when it is really a bug.
