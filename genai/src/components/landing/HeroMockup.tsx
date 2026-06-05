import { useState } from "react";

const MARKDOWN = `# Shipping fast without burning out

Most teams confuse *speed* with **urgency**.
Here's the difference — and how we ship 3x weekly.

## The three rules

1. Cut scope, never quality
2. Ship behind flags
3. Review async, decide sync

> "Velocity is a side-effect of clarity." — Sahil

[Read the full essay →](https://example.com/essay)

\`\`\`ts
const ship = (idea) => idea
  .scope('small')
  .review('async')
  .release();
\`\`\``;

type Tab = "ghost" | "newsletter" | "linkedin" | "thread";

const TABS: { id: Tab; label: string; badge: string }[] = [
  { id: "ghost", label: "Ghost", badge: "Heading fixed" },
  { id: "newsletter", label: "Newsletter", badge: "Links preserved" },
  { id: "linkedin", label: "LinkedIn", badge: "Spacing normalized" },
  { id: "thread", label: "Thread", badge: "Thread split ready" },
];

export function HeroMockup() {
  const [tab, setTab] = useState<Tab>("ghost");

  return (
    <div className="relative">
      {/* glow */}
      <div
        aria-hidden
        className="absolute -inset-x-8 -top-10 -bottom-10 -z-10 rounded-[2rem] opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 40%, color-mix(in oklab, var(--accent) 25%, transparent), transparent 70%)",
        }}
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25)]">
        {/* window chrome */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">essay.md → 4 outputs</div>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" /> synced
          </div>
        </div>

        <div className="grid md:grid-cols-[1.05fr_1fr]">
          {/* Editor */}
          <div className="border-b border-border md:border-b-0 md:border-r">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="font-mono text-[11px] text-muted-foreground">essay.md</span>
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                markdown
              </span>
            </div>
            <pre className="max-h-[360px] overflow-hidden px-4 py-4 font-mono text-[12px] leading-[1.7] text-foreground/90">
              {MARKDOWN.split("\n").map((line, i) => (
                <div key={i} className="flex gap-3">
                  <span className="w-4 select-none text-right text-muted-foreground/50">{i + 1}</span>
                  <code className="flex-1">{colorize(line)}</code>
                </div>
              ))}
            </pre>
          </div>

          {/* Output */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-2 py-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === t.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 p-4">
              <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--accent)_40%,transparent)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] px-2.5 py-1 text-[10px] font-medium text-[color-mix(in_oklab,var(--accent)_60%,var(--foreground))]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                {TABS.find((t) => t.id === tab)?.badge}
              </div>
              <div className="min-h-[300px]">{renderOutput(tab)}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>4 outputs ready</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">2 warnings auto-fixed</span>
          </div>
          <button className="rounded-md bg-foreground px-3 py-1.5 text-[11px] font-medium text-background">
            Publish all
          </button>
        </div>
      </div>
    </div>
  );
}

function colorize(line: string) {
  if (line.startsWith("# ") || line.startsWith("## "))
    return <span className="text-[color-mix(in_oklab,var(--accent)_70%,var(--foreground))]">{line}</span>;
  if (line.startsWith(">")) return <span className="text-muted-foreground">{line}</span>;
  if (line.startsWith("```")) return <span className="text-muted-foreground">{line}</span>;
  if (/^\d+\./.test(line.trim())) return <span><span className="text-[var(--warning)]">{line.trim().split(".")[0]}.</span>{line.trim().slice(line.trim().indexOf(".") + 1)}</span>;
  return <span>{line || "\u00A0"}</span>;
}

function renderOutput(tab: Tab) {
  if (tab === "ghost")
    return (
      <article className="space-y-3">
        <h3 className="text-lg font-semibold tracking-tight">Shipping fast without burning out</h3>
        <p className="text-sm text-muted-foreground">
          Most teams confuse <em>speed</em> with <strong>urgency</strong>. Here's the difference — and
          how we ship 3x weekly.
        </p>
        <h4 className="pt-1 text-sm font-semibold">The three rules</h4>
        <ol className="space-y-1 pl-5 text-sm text-foreground/80 [list-style:decimal]">
          <li>Cut scope, never quality</li>
          <li>Ship behind flags</li>
          <li>Review async, decide sync</li>
        </ol>
        <blockquote className="border-l-2 border-accent pl-3 text-sm italic text-muted-foreground">
          "Velocity is a side-effect of clarity." — Sahil
        </blockquote>
      </article>
    );
  if (tab === "newsletter")
    return (
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Weekly · Issue #42
        </div>
        <h3 className="text-base font-semibold">Shipping fast without burning out →</h3>
        <p className="text-sm text-foreground/80">
          Hi friends, this week: the three rules we use to ship 3x weekly without grinding.
        </p>
        <div className="rounded-md bg-muted px-3 py-2 text-sm">
          <span className="font-medium">1.</span> Cut scope, never quality<br />
          <span className="font-medium">2.</span> Ship behind flags<br />
          <span className="font-medium">3.</span> Review async, decide sync
        </div>
        <a className="inline-block text-sm font-medium text-foreground underline underline-offset-4">
          Read the full essay →
        </a>
      </div>
    );
  if (tab === "linkedin")
    return (
      <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
        <p className="font-medium">Most teams confuse speed with urgency.</p>
        <p className="text-foreground/80">Here's how we ship 3x weekly without burning out:</p>
        <p className="text-foreground/80">
          → Cut scope, never quality<br />
          → Ship behind flags<br />
          → Review async, decide sync
        </p>
        <p className="text-foreground/80">"Velocity is a side-effect of clarity."</p>
        <p className="text-muted-foreground">What rule would you add? 👇</p>
      </div>
    );
  return (
    <div className="space-y-2">
      {[
        "1/4 Most teams confuse speed with urgency. Here's how we ship 3x weekly without burning out 🧵",
        "2/4 Rule 1: Cut scope, never quality. Small, shippable, real.",
        "3/4 Rule 2: Ship behind flags. Rule 3: Review async, decide sync.",
        "4/4 Velocity is a side-effect of clarity. Full essay → example.com/essay",
      ].map((t, i) => (
        <div key={i} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
          {t}
        </div>
      ))}
    </div>
  );
}
