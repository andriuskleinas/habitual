import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
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
import { Faq, FAQS } from "@/components/marketing/faq";
import { Reveal } from "@/components/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const steps: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Target,
    title: "Set a challenge",
    body: "Pick the habit, how often, and how many days you'll go for.",
  },
  {
    icon: HandCoins,
    title: "Put a stake on it",
    body: "“Lunch on me if I bail.” A real cost makes today's excuse expensive.",
  },
  {
    icon: Users,
    title: "Invite a buddy",
    body: "One link. They watch your progress live — no account needed.",
  },
  {
    icon: Flame,
    title: "Keep the chain alive",
    body: "Check in daily, grow the streak, get cheered on when it counts.",
  },
];

const principles: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Eye,
    title: "Someone is watching",
    body: "A habit nobody can see is easy to skip. When a friend can open a link and see whether you showed up, skipping stops being private.",
  },
  {
    icon: HandCoins,
    title: "Something is at risk",
    body: "We work harder to avoid losing than to gain. Naming a stake you'd rather not pay turns “I'll start Monday” into “I'm going today”.",
  },
  {
    icon: Flame,
    title: "The chain gets valuable",
    body: "Every check-in makes the streak worth more. After twelve days you're not protecting a habit — you're protecting twelve days of work.",
  },
];

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
                <span className="from-brand-from to-brand-to bg-gradient-to-r bg-clip-text text-transparent">
                  buddy watching.
                </span>
              </h1>

              <p className="text-muted-foreground max-w-xl text-lg text-pretty sm:text-xl">
                Set a daily challenge, put something on the line, and invite a
                friend to hold you to it. Willpower is unreliable — being
                watched isn&apos;t.
              </p>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <Button size="xl" className="w-full sm:w-auto" asChild>
                  <Link href="/login">
                    Start a challenge
                    <ArrowRight className="size-5" aria-hidden />
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
                  <ShieldCheck className="text-success size-4" aria-hidden />
                  Free to use
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Zap className="text-success size-4" aria-hidden />
                  Magic link — no password
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Users className="text-success size-4" aria-hidden />
                  Your buddy needs no account
                </li>
              </ul>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-6 mt-16 duration-1000 lg:mt-0">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* The problem                                                      */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-y bg-muted/30">
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
              {principles.map(({ icon: Icon, title, body }, i) => (
                <Reveal key={title} delay={i * 90}>
                  <div className="bg-card ring-foreground/10 flex h-full flex-col gap-3 rounded-2xl p-6 ring-1">
                    <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
                      <Icon className="size-5" aria-hidden />
                    </span>
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
              {/* Connector rail behind the numbered markers (desktop only) */}
              <span
                className="bg-border absolute top-6 right-[12.5%] left-[12.5%] hidden h-px md:block"
                aria-hidden
              />
              {steps.map(({ icon: Icon, title, body }, i) => (
                <Reveal as="li" key={title} delay={i * 90} className="relative">
                  <div className="flex gap-4 md:flex-col md:items-center md:text-center">
                    <div className="relative flex flex-col items-center">
                      <span className="bg-card ring-primary/20 text-primary flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1">
                        <Icon className="size-5" aria-hidden />
                      </span>
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
        <section id="features" className="scroll-mt-24 border-t bg-muted/30">
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
                <div className="bg-card ring-foreground/10 flex h-full flex-col justify-between gap-6 overflow-hidden rounded-2xl p-6 ring-1 sm:p-8">
                  <div className="flex flex-col gap-2">
                    <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
                      <Flame className="size-5" aria-hidden />
                    </span>
                    <h3 className="mt-2 text-xl font-semibold">
                      A streak you can see
                    </h3>
                    <p className="text-muted-foreground text-pretty">
                      Every check-in adds a link to the chain. Current streak,
                      best streak, and how much of the plan you&apos;ve actually
                      finished — no guessing how you&apos;re doing.
                    </p>
                  </div>
                  <div
                    className="grid grid-cols-10 gap-1.5 sm:gap-2"
                    aria-hidden
                  >
                    {Array.from({ length: 30 }, (_, i) => (
                      <span
                        key={i}
                        className={
                          i === 4 || i === 11
                            ? "bg-muted-foreground/15 aspect-square rounded-[5px]"
                            : "bg-primary/80 aspect-square rounded-[5px]"
                        }
                      />
                    ))}
                  </div>
                </div>
              </Reveal>

              {/* Stakes */}
              <Reveal delay={90}>
                <div className="bg-card ring-foreground/10 flex h-full flex-col gap-3 rounded-2xl p-6 ring-1 sm:p-8">
                  <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
                    <HandCoins className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-2 text-xl font-semibold">Real stakes</h3>
                  <p className="text-muted-foreground text-pretty">
                    Name what you lose if you bail. Your buddy sees it, which is
                    what makes it stick.
                  </p>
                  <div className="bg-accent/60 text-accent-foreground mt-auto flex items-start gap-2.5 rounded-xl px-4 py-3">
                    <HandCoins className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <p className="text-sm text-pretty">
                      <span className="font-medium">On the line: </span>
                      Lunch on me if I miss a day.
                    </p>
                  </div>
                </div>
              </Reveal>

              {/* Buddy link */}
              <Reveal delay={90}>
                <div className="bg-card ring-foreground/10 flex h-full flex-col gap-3 rounded-2xl p-6 ring-1 sm:p-8">
                  <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
                    <Link2 className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-2 text-xl font-semibold">
                    One link, zero friction
                  </h3>
                  <p className="text-muted-foreground text-pretty">
                    Send a link or show the QR code. Your buddy watches live —
                    no download, no account, no excuses.
                  </p>
                </div>
              </Reveal>

              {/* Reactions — wide tile */}
              <Reveal delay={90} className="md:col-span-2">
                <div className="bg-card ring-foreground/10 flex h-full flex-col gap-4 rounded-2xl p-6 ring-1 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
                  <div className="flex flex-col gap-3 sm:flex-1">
                    <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
                      <BellRing className="size-5" aria-hidden />
                    </span>
                    <h3 className="mt-2 text-xl font-semibold">
                      Cheers when you&apos;re winning, nudges when you&apos;re not
                    </h3>
                    <p className="text-muted-foreground text-pretty">
                      Your buddy can cheer, nudge or leave a note in one tap.
                      Encouragement lands the day it matters.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:w-64">
                    <div className="bg-muted/60 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm">
                      <span className="text-base" aria-hidden>
                        🎉
                      </span>
                      <span className="text-pretty">
                        <span className="font-medium">Sam</span>{" "}
                        <span className="text-muted-foreground">cheered you</span>
                      </span>
                    </div>
                    <div className="bg-muted/60 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm">
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
                <div className="bg-card ring-foreground/10 flex h-full flex-col gap-3 rounded-2xl p-6 ring-1 sm:p-8">
                  <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
                    <CalendarCheck className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-2 text-xl font-semibold">
                    A check-in worth showing up for
                  </h3>
                  <p className="text-muted-foreground text-pretty">
                    Mark it done or log a number, add a note, and take the
                    confetti. It&apos;s a five-second ritual by design.
                  </p>
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
                  className="bg-white text-neutral-900 shadow-lg hover:bg-white/90 dark:bg-white dark:text-neutral-900 dark:hover:bg-white/90"
                  asChild
                >
                  <Link href="/login">
                    Start your first streak
                    <ArrowRight className="size-5" aria-hidden />
                  </Link>
                </Button>
                <p className="text-sm text-white/70">
                  Free · magic-link sign-in · no card needed
                </p>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-5 py-10 text-sm sm:flex-row sm:justify-between sm:px-8">
          <div className="flex items-center gap-2">
            <Flame className="text-primary size-4" aria-hidden />
            <span>
              Habitual — habits stick when someone&apos;s watching.
            </span>
          </div>
          <nav aria-label="Footer" className="flex items-center gap-5">
            <a href="#how-it-works" className="hover:text-foreground rounded-sm">
              How it works
            </a>
            <a href="#faq" className="hover:text-foreground rounded-sm">
              FAQ
            </a>
            <Link href="/login" className="hover:text-foreground rounded-sm">
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
