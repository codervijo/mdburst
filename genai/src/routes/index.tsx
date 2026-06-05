import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { HeroMockup } from "@/components/landing/HeroMockup";
import {
  Problem,
  Solution,
  HowItWorks,
  Outputs,
  Features,
  UseCases,
  Pricing,
} from "@/components/landing/Sections";
import { WaitlistForm } from "@/components/landing/Waitlist";
import { Footer } from "@/components/landing/Footer";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "mdburst — Write once in markdown. Publish everywhere." },
      {
        name: "description",
        content:
          "mdburst converts one markdown draft into platform-ready blog posts, newsletters, LinkedIn posts, and social threads — with formatting that survives the trip.",
      },
      { property: "og:title", content: "mdburst — Write once. Publish everywhere." },
      {
        property: "og:description",
        content:
          "Turn one markdown draft into publish-ready posts for Ghost, newsletters, LinkedIn, and social threads.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  useReveal();
  return (
    <div id="top" className="min-h-screen bg-background text-foreground">
      <Nav />

      {/* HERO */}
      <section className="relative overflow-hidden pt-32 sm:pt-40">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid mask-fade-b opacity-50" />
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="reveal mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
              Now in private beta — join the waitlist
            </div>
            <h1 className="reveal text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              Write once in markdown.<br />
              <span className="text-muted-foreground">Publish everywhere.</span>
            </h1>
            <p className="reveal mx-auto mt-6 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              mdburst converts one markdown draft into platform-ready blog posts, newsletters,
              LinkedIn posts, and social threads — with formatting that survives the trip.
            </p>
            <div className="reveal mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#waitlist"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                Join the waitlist <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#how"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="reveal mt-16 sm:mt-20">
            <HeroMockup />
          </div>

          <div className="reveal mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
            <span>Works with</span>
            {["Ghost", "Buffer", "LinkedIn", "Substack-ready", "Beehiiv-ready"].map((p) => (
              <span key={p} className="font-medium text-foreground/70">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Problem />
      <Solution />
      <HowItWorks />
      <Outputs />
      <Features />
      <UseCases />
      <Pricing />

      {/* FINAL CTA */}
      <section id="waitlist" className="px-6 pb-24 pt-12 sm:pb-32">
        <div className="reveal mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card p-10 text-center sm:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              background:
                "radial-gradient(40% 40% at 50% 0%, color-mix(in oklab, var(--accent) 20%, transparent), transparent)",
            }}
          />
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Stop reformatting.<br />
            <span className="text-muted-foreground">Start publishing.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-balance text-muted-foreground">
            Be the first to write once and publish everywhere. Early waitlist members get
            launch pricing and onboarding support.
          </p>
          <div className="mt-8 flex justify-center">
            <WaitlistForm size="lg" />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
