import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  CheckCircle2,
  Eye,
  Flame,
  HandCoins,
  Link2,
  type LucideIcon,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { ChainDemo } from "@/components/marketing/chain-demo";
import { Faq, FAQS } from "@/components/marketing/faq";
import { LogoGlyph } from "@/components/brand";
import { Reveal } from "@/components/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Colour carries meaning on this page, the same meaning it carries in the app:
 * indigo is structure and navigation, green is a kept commitment, amber is
 * someone reminding you. An icon tile picks its tone from what it's about, not
 * from where it sits in the grid.
 */
type Tone = "brand" | "progress" | "cheer";

const TONES: Record<Tone, string> = {
  brand: "bg-primary/10 text-primary",
  progress: "bg-success/12 text-success-ink",
  cheer: "bg-cheer/20 text-cheer-ink",
};

function IconTile({
  icon: Icon,
  tone,
  className,
}: {
  icon: LucideIcon;
  tone: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
        TONES[tone],
        className,
      )}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

const steps: { icon: LucideIcon; tone: Tone; title: string; body: string }[] = [
  {
    icon: Target,
    tone: "brand",
    title: "Set a challenge",
    body: "Pick the habit, how often, and how many days you'll go for.",
  },
  {
    icon: HandCoins,
    tone: "cheer",
    title: "Put a stake on it",
    body: "“Lunch on me if I bail.” A real cost makes today's excuse expensive.",
  },
  {
    icon: Users,
    tone: "brand",
    title: "Invite a buddy",
    body: "One link. They watch your progress live — no account needed.",
  },
  {
    icon: Flame,
    tone: "progress",
    title: "Keep the chain alive",
    body: "Check in daily, grow the streak, get cheered on when it counts.",
  },
];

const principles: { icon: LucideIcon; tone: Tone; title: string; body: string }[] =
  [
    {
      icon: Eye,
      tone: "brand",
      title: "Someone is watching",
      body: "A habit nobody can see is easy to skip. When a friend can open a link and see whether you showed up, skipping stops being private.",
    },
    {
      icon: HandCoins,
      tone: "cheer",
      title: "Something is at risk",
      body: "We work harder to avoid losing than to gain. Naming a stake you'd rather not pay turns “I'll start Monday” into “I'm going today”.",
    },
    {
      icon: Flame,
      tone: "progress",
      title: "The chain gets valuable",
      body: "Every check-in makes the streak worth more. After twelve days you're not protecting a habit — you're protecting twelve days of work.",
    },
  ];

/** Shared surface for every card-shaped block on the page. */
const TILE =
  "group bg-card ring-foreground/10 lift hover:ring-primary/30 flex h-full flex-col rounded-2xl ring-1 hover:shadow-lg";

export default function Home() {
  // FAQ structured data — lets search engines and AI answer surfaces quote the
  // real answers instead of guessing at them.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <>
      <SiteHeader />

      <main id="main" className="flex-1">
        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                             */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative overflow-hidden">
          <div
            className="text-foreground/[0.07] dot-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
            aria-hidden
          />
          <div className="mx-auto w-full max-w-6xl px-5 pt-14 pb-16 sm:px-8 sm:pt-20 lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:pt-24 lg:pb-28">
            <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-start gap-6 duration-700">
              <Badge variant="secondary" className="h-7 gap-1.5 rounded-full px-3">
                <Sparkles className="size-3.5" aria-hidden />
                Accountability, gamified
              </Badge>

              <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Build habits with a{" "}
                {/* The gradient runs indigo → green: the commitment you make,
                    ending in the thing you're after. */}
                <span className="from-brand-from via-brand-to to-success-ink bg-gradient-to-r bg-clip-text text-transparent">
                  buddy watching.
                </span>
              </h1>

              <p className="text-muted-foreground max-w-xl text-lg text-pretty sm:text-xl">
                Set a daily challenge, put something on the line, and invite a
                friend to hold you to it. Willpower is unreliable — being
                watched isn&apos;t.
              </p>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <Button
                  size="xl"
                  className="w-full shadow-md transition-transform hover:-translate-y-0.5 sm:w-auto"
                  asChild
                >
                  <Link href="/signup">
                    Start a challenge
                    <ArrowRight className="size-5 transition-transform duration-300 group-hover/button:translate-x-1" aria-hidden />
                  </Link>
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  className="w-full sm:w-auto"
                  asChild
                >
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>

              <ul className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <li className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="text-success-ink size-4" aria-hidden />
                  Free to use
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Zap className="text-success-ink size-4" aria-hidden />
                  Password or magic link
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Users className="text-success-ink size-4" aria-hidden />
                  Your buddy needs no account
                </li>
              </ul>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-6 mt-16 flex flex-col gap-4 duration-1000 lg:mt-0">
              <HeroPreview />
              {/* The card is playable and nothing about a screenshot-shaped
                  thing says so. */}
              <p className="text-muted-foreground mt-4 text-center text-xs">
                Go on — log the open day. It&apos;s the real thing.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* The problem                                                      */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-muted/30 border-y">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
            <Reveal className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                Habit apps let you quit quietly.
              </h2>
              <p className="text-muted-foreground max-w-2xl text-pretty">
                You download one, you log three days, you miss a day, and
                nothing happens. No one notices. Nothing is lost. That&apos;s
                the whole problem — and it&apos;s the one thing Habitual fixes.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {principles.map(({ icon, tone, title, body }, i) => (
                <Reveal key={title} delay={i * 90}>
                  <div className={cn(TILE, "gap-3 p-6")}>
                    <IconTile icon={icon} tone={tone} />
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-muted-foreground text-sm text-pretty">
                      {body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* How it works                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section id="how-it-works" className="scroll-mt-24">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <Reveal className="flex flex-col items-center gap-3 text-center">
              <p className="text-primary text-sm font-semibold tracking-wide uppercase">
                How it works
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Four steps. About a minute.
              </h2>
              <p className="text-muted-foreground max-w-2xl text-pretty">
                From a vague intention to a live, watched challenge before your
                coffee gets cold.
              </p>
            </Reveal>

            <ol className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
              {/* Connector rail behind the numbered markers (desktop only). It
                  runs through the same indigo → green the page ends on. */}
              <span
                className="from-primary/30 via-primary/25 to-success/40 absolute top-6 right-[12.5%] left-[12.5%] hidden h-px bg-gradient-to-r md:block"
                aria-hidden
              />
              {steps.map(({ icon, tone, title, body }, i) => (
                <Reveal
                  as="li"
                  key={title}
                  delay={i * 90}
                  className="group relative"
                >
                  <div className="flex gap-4 md:flex-col md:items-center md:text-center">
                    <div className="relative flex flex-col items-center">
                      <IconTile
                        icon={icon}
                        tone={tone}
                        className="bg-card ring-foreground/10 size-12 shrink-0 rounded-2xl shadow-sm ring-1"
                      />
                      {/* Vertical rail for the stacked mobile layout */}
                      {i < steps.length - 1 && (
                        <span
                          className="bg-border mt-2 w-px flex-1 md:hidden"
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 pb-8 md:pb-0">
                      <h3 className="font-semibold">
                        <span className="text-muted-foreground tabular-nums">
                          {i + 1}.
                        </span>{" "}
                        {title}
                      </h3>
                      <p className="text-muted-foreground text-sm text-pretty">
                        {body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Features — bento grid                                            */}
        {/* ---------------------------------------------------------------- */}
        <section id="features" className="bg-muted/30 scroll-mt-24 border-t">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <Reveal className="flex flex-col items-center gap-3 text-center">
              <p className="text-primary text-sm font-semibold tracking-wide uppercase">
                What you get
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Everything that makes a streak hard to break.
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {/* Streak — the hero tile */}
              <Reveal className="md:col-span-2">
                <div
                  className={cn(TILE, "justify-between gap-6 p-6 sm:p-8")}
                >
                  <div className="flex flex-col gap-2">
                    <IconTile icon={Flame} tone="progress" />
                    <h3 className="mt-2 text-xl font-semibold">
                      A streak you can see
                    </h3>
                    <p className="text-muted-foreground text-pretty">
                      Every check-in adds a link to the chain. Current streak,
                      best streak, and how much of the plan you&apos;ve actually
                      finished — no guessing how you&apos;re doing.
                    </p>
                  </div>
                  <ChainDemo />
                </div>
              </Reveal>

              {/* Stakes */}
              <Reveal delay={90}>
                <div className={cn(TILE, "gap-3 p-6 sm:p-8")}>
                  <IconTile icon={HandCoins} tone="cheer" />
                  <h3 className="mt-2 text-xl font-semibold">Real stakes</h3>
                  <p className="text-muted-foreground text-pretty">
                    Name what you lose if you bail. Your buddy sees it, which is
                    what makes it stick.
                  </p>
                  <div className="bg-cheer/15 ring-cheer/25 mt-auto flex items-start gap-2.5 rounded-xl px-4 py-3 ring-1">
                    <HandCoins
                      className="text-cheer-ink mt-0.5 size-4 shrink-0"
                      aria-hidden
                    />
                    <p className="text-sm text-pretty">
                      <span className="font-medium">On the line: </span>
                      Lunch on me if I miss a day.
                    </p>
                  </div>
                </div>
              </Reveal>

              {/* Buddy link */}
              <Reveal delay={90}>
                <div className={cn(TILE, "gap-3 p-6 sm:p-8")}>
                  <IconTile icon={Link2} tone="brand" />
                  <h3 className="mt-2 text-xl font-semibold">
                    One link, zero friction
                  </h3>
                  <p className="text-muted-foreground text-pretty">
                    Send a link or show the QR code. Your buddy watches live —
                    no download, no account, no excuses.
                  </p>
                  <div className="bg-primary/10 ring-primary/20 mt-auto flex items-center gap-2.5 rounded-xl px-4 py-3 ring-1">
                    <Link2 className="text-primary size-4 shrink-0" aria-hidden />
                    <span className="truncate font-mono text-sm">
                      habitual.app/j/7QK2M
                    </span>
                  </div>
                </div>
              </Reveal>

              {/* Reactions */}
              <Reveal delay={90}>
                <div className={cn(TILE, "gap-3 p-6 sm:p-8")}>
                  <IconTile icon={BellRing} tone="cheer" />
                  <h3 className="mt-2 text-xl font-semibold text-balance">
                    Cheers when you&apos;re winning, nudges when you&apos;re not
                  </h3>
                  <p className="text-muted-foreground text-pretty">
                    Your buddy can cheer, nudge or leave a note in one tap.
                    Encouragement lands the day it matters.
                  </p>
                  {/* The two notes drift apart a little on hover — a reaction
                      wall that reads as alive rather than as a screenshot. */}
                  <div className="mt-auto flex flex-col gap-2 pt-4">
                    <div className="bg-cheer/15 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-transform duration-300 group-hover:-translate-x-1">
                      <span className="text-base" aria-hidden>
                        🎉
                      </span>
                      <span className="text-pretty">
                        <span className="font-medium">Sam</span>{" "}
                        <span className="text-muted-foreground">cheered you</span>
                      </span>
                    </div>
                    <div className="bg-cheer/15 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-transform duration-300 group-hover:translate-x-1">
                      <span className="text-base" aria-hidden>
                        👋
                      </span>
                      <span className="text-pretty">
                        <span className="font-medium">Alex</span>{" "}
                        <span className="text-muted-foreground">
                          nudged you — day 13?
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* Daily check-in */}
              <Reveal delay={90}>
                <div className={cn(TILE, "gap-3 p-6 sm:p-8")}>
                  <IconTile icon={CalendarCheck} tone="progress" />
                  <h3 className="mt-2 text-xl font-semibold">
                    A check-in worth showing up for
                  </h3>
                  <p className="text-muted-foreground text-pretty">
                    Mark it done or log a number, add a note, and take the
                    confetti. It&apos;s a five-second ritual by design.
                  </p>
                  <div className="bg-success/15 ring-success/25 mt-auto flex items-center gap-2.5 rounded-xl px-4 py-3 ring-1">
                    <CheckCircle2
                      className="text-success-ink size-4 shrink-0"
                      aria-hidden
                    />
                    <p className="text-sm text-pretty">
                      <span className="font-medium">Day 12 done. </span>
                      <span className="text-muted-foreground">20 pages read.</span>
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* FAQ                                                              */}
        {/* ---------------------------------------------------------------- */}
        <section id="faq" className="scroll-mt-24 border-t">
          <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
            <Reveal className="flex flex-col items-center gap-3 text-center">
              <p className="text-primary text-sm font-semibold tracking-wide uppercase">
                FAQ
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Questions, answered.
              </h2>
            </Reveal>
            <Reveal className="mt-10">
              <Faq />
            </Reveal>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Final CTA                                                        */}
        {/* ---------------------------------------------------------------- */}
        <section className="px-5 pb-20 sm:px-8">
          <Reveal className="mx-auto w-full max-w-6xl">
            <div className="from-brand-from to-brand-to relative overflow-hidden rounded-3xl bg-gradient-to-br px-6 py-14 text-center sm:px-12 sm:py-20">
              <div
                className="dot-grid pointer-events-none absolute inset-0 text-white/20"
                aria-hidden
              />
              {/* A green wash in the corner the eye lands on last — the same
                  "kept it" colour the whole page has been building toward. */}
              <div
                className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-[color-mix(in_oklch,var(--success),transparent_65%)] blur-3xl"
                aria-hidden
              />
              <div className="relative flex flex-col items-center gap-6">
                <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-balance text-white sm:text-4xl">
                  What would you do differently if someone were watching?
                </h2>
                <p className="max-w-xl text-lg text-pretty text-white/80">
                  Start a challenge, send one link, and find out. It takes about
                  a minute.
                </p>
                <Button
                  size="xl"
                  className="bg-white text-neutral-900 shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-white/90 dark:bg-white dark:text-neutral-900 dark:hover:bg-white/90"
                  asChild
                >
                  <Link href="/signup">
                    Start your first streak
                    <ArrowRight
                      className="size-5 transition-transform duration-300 group-hover/button:translate-x-1"
                      aria-hidden
                    />
                  </Link>
                </Button>
                <p className="text-sm text-white/70">
                  Free · no card needed · your buddy needs no account
                </p>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-5 py-10 text-sm sm:flex-row sm:justify-between sm:px-8">
          <div className="flex items-center gap-2">
            <LogoGlyph className="text-primary h-4 w-auto shrink-0" />
            <span>
              Habitual — habits stick when someone&apos;s watching.
            </span>
          </div>
          <nav aria-label="Footer" className="flex items-center gap-5">
            <a href="#how-it-works" className="hover:text-foreground rounded-sm transition-colors">
              How it works
            </a>
            <a href="#faq" className="hover:text-foreground rounded-sm transition-colors">
              FAQ
            </a>
            <Link href="/login" className="hover:text-foreground rounded-sm transition-colors">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
