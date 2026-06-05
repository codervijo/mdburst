import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileCode2,
  Eye,
  Send,
  Layers,
  Link2,
  Image as ImageIcon,
  Ruler,
  Split,
  FileText,
  Repeat,
  Zap,
} from "lucide-react";

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <div className="reveal mx-auto max-w-2xl text-center">
        {eyebrow && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
        {description && (
          <p className="mt-4 text-balance text-base text-muted-foreground sm:text-lg">
            {description}
          </p>
        )}
      </div>
      <div className="mt-14">{children}</div>
    </section>
  );
}

export function Problem() {
  const items = [
    "Blog formatting breaks across platforms",
    "Newsletter previews differ from final output",
    "LinkedIn spacing gets mangled on paste",
    "Social threads need manual splitting",
    "Links, embeds, and headings need cleanup",
  ];
  return (
    <Section
      id="problem"
      eyebrow="The problem"
      title="Publishing should not be four reformatting jobs"
      description="You finish writing. Then the real work begins — copying, cleaning, splitting, previewing, and praying nothing breaks."
    >
      <div className="reveal mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)] text-[var(--destructive)]">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm text-foreground/85">{item}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Solution() {
  return (
    <Section
      id="solution"
      eyebrow="The fix"
      title="One source file. Multiple clean outputs."
      description="mdburst takes your markdown and converts it into destination-specific formats using platform templates and AI-assisted formatting rules. Your draft stays the source of truth."
    >
      <div className="reveal mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <FileCode2 className="h-3.5 w-3.5" /> essay.md
          </div>
          <pre className="overflow-hidden rounded-lg bg-muted p-4 font-mono text-[11px] leading-relaxed text-foreground/80">
{`# Title

Short intro paragraph
with **emphasis** and a [link](#).

- bullet one
- bullet two`}
          </pre>
        </div>
        <ArrowRight className="mx-auto hidden h-6 w-6 text-muted-foreground md:block" />
        <div className="grid gap-3">
          {[
            { label: "Ghost", note: "Semantic HTML + clean headings" },
            { label: "Newsletter", note: "Inlined styles, safe links" },
            { label: "LinkedIn", note: "Spacing + emoji bullets" },
            { label: "Thread", note: "Auto-split, 280-char safe" },
          ].map((o) => (
            <div
              key={o.label}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium">{o.label}</div>
                <div className="text-xs text-muted-foreground">{o.note}</div>
              </div>
              <Check className="h-4 w-4 text-[var(--success)]" />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function HowItWorks() {
  const steps = [
    {
      icon: FileCode2,
      title: "Paste or upload markdown",
      desc: "Drop a .md file or paste your draft. mdburst understands frontmatter, code blocks, and embeds.",
    },
    {
      icon: Eye,
      title: "Preview platform-ready versions",
      desc: "See exactly how it'll render on Ghost, your newsletter, LinkedIn, and as a thread. Side by side.",
    },
    {
      icon: Send,
      title: "Publish or export with one click",
      desc: "Push to Ghost, schedule via Buffer, copy to clipboard, or export HTML — all from one screen.",
    },
  ];
  return (
    <Section id="how" eyebrow="How it works" title="Three steps. Zero busywork.">
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <div
            key={s.title}
            className="reveal relative rounded-2xl border border-border bg-card p-6"
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-foreground text-background">
                <s.icon className="h-5 w-5" />
              </div>
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
            </div>
            <h3 className="text-base font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Outputs() {
  const cards = [
    { name: "Ghost blog post", tag: "Native" },
    { name: "Newsletter HTML/export", tag: "Inlined" },
    { name: "LinkedIn post", tag: "Formatted" },
    { name: "Social thread", tag: "Auto-split" },
    { name: "Buffer scheduling", tag: "Connected" },
  ];
  return (
    <Section
      id="outputs"
      eyebrow="Outputs"
      title="Built for the way creators actually publish"
      description="Ghost + Buffer first. More integrations coming."
    >
      <div className="reveal grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.name}
            className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/30"
          >
            <div className="mb-6 inline-flex rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {c.tag}
            </div>
            <div className="text-sm font-medium">{c.name}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Features() {
  const features = [
    { icon: FileCode2, title: "Markdown source of truth", desc: "Your .md file is canonical. Outputs regenerate from it — no drift." },
    { icon: Layers, title: "Platform-specific rules", desc: "Each destination has its own formatting profile, tuned by hand." },
    { icon: Eye, title: "Side-by-side previews", desc: "Every output rendered exactly as it'll appear, live as you edit." },
    { icon: Ruler, title: "Character-limit warnings", desc: "Catch overflow before publish — for LinkedIn, threads, and previews." },
    { icon: Split, title: "Thread splitting", desc: "Auto-segment long posts at sentence boundaries, 280-char safe." },
    { icon: Link2, title: "Link preservation", desc: "Links survive the trip — no stripped anchors, no broken markdown." },
    { icon: ImageIcon, title: "Embedded media handling", desc: "Images, code blocks, and embeds rendered correctly per platform." },
    { icon: Zap, title: "One-click publishing", desc: "Push to Ghost or schedule via Buffer from a single button." },
    { icon: Repeat, title: "Reusable templates", desc: "Save formatting profiles per brand, channel, or client." },
  ];
  return (
    <Section id="features" eyebrow="Features" title="Formatting fidelity, automated">
      <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="reveal flex flex-col bg-card p-6"
            style={{ transitionDelay: `${(i % 3) * 60}ms` }}
          >
            <f.icon className="h-5 w-5 text-foreground/70" />
            <h3 className="mt-4 text-[15px] font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function UseCases() {
  const cases = [
    { who: "Indie blogger", line: "Publishing weekly without the copy-paste tax." },
    { who: "Technical founder", line: "Turning essays into LinkedIn posts that actually read well." },
    { who: "DevRel team", line: "Repurposing technical posts across docs, blog, and threads." },
    { who: "Content agency", line: "Managing client workspaces with reusable brand templates." },
  ];
  return (
    <Section id="use-cases" eyebrow="Who it's for" title="If you write in markdown, this is for you">
      <div className="reveal grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {cases.map((c) => (
          <div key={c.who} className="rounded-2xl border border-border bg-card p-6">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div className="mt-5 text-sm font-semibold">{c.who}</div>
            <p className="mt-1 text-sm text-muted-foreground">{c.line}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Pricing() {
  const tiers = [
    {
      name: "Solo",
      price: 29,
      tagline: "For one creator shipping consistently.",
      features: ["Markdown conversion", "Ghost + Buffer publishing", "All output formats", "1 brand profile"],
    },
    {
      name: "Pro",
      price: 49,
      tagline: "For creators with multiple channels.",
      features: ["Everything in Solo", "Reusable templates", "Scheduling", "Up to 3 brand profiles"],
      featured: true,
    },
    {
      name: "Team",
      price: 99,
      tagline: "For agencies and DevRel teams.",
      features: ["Everything in Pro", "Team workflows", "Client workspaces", "Unlimited brand profiles"],
    },
  ];
  return (
    <Section
      id="pricing"
      eyebrow="Pricing"
      title="Simple pricing. Launch discount for waitlist."
    >
      <div className="reveal grid gap-4 md:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`relative flex flex-col rounded-2xl border bg-card p-7 ${
              t.featured
                ? "border-foreground/20 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)]"
                : "border-border"
            }`}
          >
            {t.featured && (
              <div className="absolute -top-3 left-7 rounded-full bg-foreground px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-background">
                Most popular
              </div>
            )}
            <div className="text-sm font-medium">{t.name}</div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight">${t.price}</span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t.tagline}</p>
            <ul className="mt-6 space-y-2.5">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <a
              href="#waitlist"
              className={`mt-7 inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                t.featured
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "border border-border hover:bg-muted"
              }`}
            >
              Join waitlist
            </a>
          </div>
        ))}
      </div>
    </Section>
  );
}
