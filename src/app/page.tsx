import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroCarousel } from "@/components/marketing/hero-carousel";
import {
  LinkDemo,
  LogDemo,
  SetChallengeDemo,
  StakeDemo,
} from "@/components/marketing/step-demos";
import { Faq, FAQS } from "@/components/marketing/faq";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Type does the work on this page. Headlines are large, regular weight and
 * tracked tight; one phrase per section may be set in the serif italic, and
 * never more than one. Numbers stay in the sans: the serif's "1" has no flag,
 * so a streak of 11 would read as "ll". Sections alternate between the ink band and the page
 * background instead of being boxed.
 *
 * Colour still carries the app's meaning: buttons are ink, green is a kept
 * day, amber is the stake. The pastels are illustration surfaces only.
 */

/* ------------------------------------------------------------------------ */
/* Pastel surfaces for the step cards                                       */
/* ------------------------------------------------------------------------ */

type Pastel = "lavender" | "amber" | "sky" | "mint";

const PASTEL: Record<Pastel, string> = {
  lavender: "bg-pastel-lavender",
  amber: "bg-pastel-amber",
  sky: "bg-pastel-sky",
  mint: "bg-pastel-mint",
};

/* ------------------------------------------------------------------------ */
/* How it works: one pastel card per step, each holding a real UI fragment  */
/* ------------------------------------------------------------------------ */

function StepCard({
  step,
  title,
  points,
  pastel,
  children,
}: {
  step: number;
  title: string;
  points: string[];
  pastel: Pastel;
  /** The animated UI fragment. Illustrative, so hidden from assistive tech;
      `points` carries the meaning. */
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "text-pastel-foreground flex h-full flex-col overflow-hidden rounded-[32px] px-6 pt-7 sm:px-8 sm:pt-8 md:min-h-[25rem]",
        PASTEL[pastel],
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-3xl leading-none tracking-[-0.035em] sm:text-[2rem]">
          {title}
        </h3>
        <span className="bg-background/55 shrink-0 rounded-full px-3 py-1.5 text-[13px] leading-none">
          Step {step}
        </span>
      </div>
      <ul className="border-pastel-foreground/20 mt-4 mb-8 flex flex-col gap-1 border-l pl-4 text-[15px] opacity-80">
        {points.map((p) => (
          <li key={p} className="text-pretty">
            {p}
          </li>
        ))}
      </ul>
      <div
        aria-hidden
        className="bg-card text-card-foreground mt-auto rounded-t-2xl p-5 pb-7 shadow-[0_20px_40px_-20px_rgb(0_0_0/0.35)] sm:ml-10"
      >
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  // FAQ structured data, so search engines and AI answer surfaces can quote
  // the real answers instead of guessing at them.
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
        <section className="band-ink overflow-hidden">
          <div className="mx-auto w-full max-w-6xl px-5 pt-16 text-center sm:px-8 sm:pt-24">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="mx-auto max-w-[11ch] text-[clamp(2.75rem,8.5vw,6.5rem)] leading-[0.95] tracking-[-0.055em] text-balance">
                Build habits with a buddy{" "}
                <em className="text-ink-accent font-serif tracking-[-0.02em]">
                  watching.
                </em>
              </h1>

              <p className="text-ink-muted mx-auto mt-6 max-w-xl text-lg text-pretty sm:text-xl">
                Set a challenge, name what you lose if you skip, and send one
                link to a friend. They see every day you log, and every day you
                don&apos;t.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="xl"
                  variant="inverse"
                  className="w-full sm:w-auto"
                  asChild
                >
                  <Link href="/signup">
                    Start a challenge
                    <ArrowRight
                      className="size-5 transition-transform duration-300 group-hover/button:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </Button>
                <Button
                  size="xl"
                  variant="inverse-outline"
                  className="w-full sm:w-auto"
                  asChild
                >
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>
              <p className="text-ink-subtle mt-4 text-sm">
                Free. Your buddy just opens the link.
              </p>
            </div>

            {/* Five challenges on a turntable. The one in the middle plays a
                short story about what the product does, then the table turns.
                Hover to pause; the check-in button is the real one. */}
            <div className="animate-in fade-in slide-in-from-bottom-8 mt-14 pb-16 duration-1000 sm:mt-16">
              <HeroCarousel />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* The argument, at display size                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="band-ink border-ink-line border-t">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-20 sm:px-8 sm:py-28">
            <Reveal>
              <p className="max-w-[22ch] text-[clamp(1.875rem,4.6vw,3.5rem)] leading-[1.06] tracking-[-0.035em] text-pretty">
                Most habit apps let you quit quietly.{" "}
                <span className="text-ink-subtle">
                  You log three days, miss one, and nobody notices.
                </span>
              </p>
            </Reveal>
            <Reveal>
              <p className="max-w-[22ch] text-[clamp(1.875rem,4.6vw,3.5rem)] leading-[1.06] tracking-[-0.035em] text-pretty">
                Habitual puts a friend on the other end of every streak,{" "}
                <span className="text-ink-subtle">
                  and something you&apos;d rather not lose on the line.
                </span>
              </p>
            </Reveal>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* How it works                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section id="how-it-works" className="scroll-mt-16">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="text-center">
              <h2 className="text-[clamp(2.5rem,6.5vw,4.5rem)] leading-none tracking-[-0.05em]">
                How it works
              </h2>
              <p className="text-muted-foreground mt-4 text-lg text-pretty">
                About a minute from an idea to a challenge someone is watching.
              </p>
            </Reveal>

            {/* `grid-cols-1` (minmax(0, 1fr)), not the implicit auto column: an auto
                track grows to its widest unbreakable content, and the
                invite link in step 3 would push every card off a phone. */}
            <ol className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:mt-16 lg:gap-6">
              <Reveal as="li">
                <StepCard
                  step={1}
                  title="Set the challenge"
                  pastel="lavender"
                  points={[
                    "Pick the habit, how often and for how long.",
                    "Every day, weekdays, one day a week, weekly, monthly, or a running total.",
                  ]}
                >
                  <SetChallengeDemo />
                </StepCard>
              </Reveal>

              <Reveal as="li" delay={80}>
                <StepCard
                  step={2}
                  title="Name the stake"
                  pastel="amber"
                  points={[
                    "Something small you'd rather not pay, like lunch or a week of dishes.",
                    "Your buddy sees it from day one.",
                  ]}
                >
                  <StakeDemo />
                </StepCard>
              </Reveal>

              <Reveal as="li">
                <StepCard
                  step={3}
                  title="Send the link"
                  pastel="sky"
                  points={[
                    "Your buddy opens it and watches your progress live, with no account.",
                    "They sign in only to cheer, nudge or leave a note.",
                  ]}
                >
                  <LinkDemo />
                </StepCard>
              </Reveal>

              <Reveal as="li" delay={80}>
                <StepCard
                  step={4}
                  title="Log each day"
                  pastel="mint"
                  points={[
                    "Five seconds a day, confetti included.",
                    "Go past the skips you allowed and the stake is due.",
                  ]}
                >
                  <LogDemo />
                </StepCard>
              </Reveal>
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* FAQ                                                              */}
        {/* ---------------------------------------------------------------- */}
        <section id="faq" className="border-border scroll-mt-16 border-t">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_1.7fr] lg:gap-16">
            <Reveal>
              <h2 className="text-[clamp(2.25rem,5vw,3.5rem)] leading-none tracking-[-0.045em]">
                Questions
              </h2>
              <p className="text-muted-foreground mt-4 max-w-xs text-pretty">
                The short version: your buddy needs nothing, and you need about
                a minute.
              </p>
            </Reveal>
            <Reveal>
              <Faq />
            </Reveal>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Closing                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section className="band-ink">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-end gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_auto]">
            <Reveal>
              <h2 className="max-w-[14ch] text-[clamp(2.25rem,5.5vw,4rem)] leading-none tracking-[-0.045em] text-balance">
                What would you do if someone were{" "}
                <em className="text-ink-accent font-serif tracking-[-0.02em]">
                  watching?
                </em>
              </h2>
            </Reveal>
            <Reveal className="flex flex-col items-start gap-3 lg:items-end">
              <Button size="xl" variant="inverse" asChild>
                <Link href="/signup">
                  Start your first streak
                  <ArrowRight
                    className="size-5 transition-transform duration-300 group-hover/button:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </Button>
              <p className="text-ink-subtle text-sm">Free. No card needed.</p>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
