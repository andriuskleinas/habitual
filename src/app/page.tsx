import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { Faq, FAQS } from "@/components/marketing/faq";
import { LogoGlyph } from "@/components/brand";
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
/* Hero: example challenge cards either side of the live demo                */
/* ------------------------------------------------------------------------ */

type Pastel = "lavender" | "amber" | "sky" | "mint";

const PASTEL: Record<Pastel, string> = {
  lavender: "bg-pastel-lavender",
  amber: "bg-pastel-amber",
  sky: "bg-pastel-sky",
  mint: "bg-pastel-mint",
};

/** Decorative: other challenges someone might be running. Hidden from
    assistive tech, which gets the live demo instead. */
function ExampleCard({
  title,
  streak,
  unit,
  pastel,
  className,
}: {
  title: string;
  streak: number;
  unit: string;
  pastel: Pastel;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "text-pastel-foreground shrink-0 flex-col justify-between rounded-[28px] p-5 text-left",
        PASTEL[pastel],
        className,
      )}
    >
      <p className="text-lg leading-tight tracking-[-0.02em]">{title}</p>
      <div>
        <p className="text-6xl leading-[0.9] tracking-[-0.05em]">
          {streak}
        </p>
        <p className="mt-1 text-[13px] opacity-70">{unit}</p>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <span
              key={i}
              className="bg-pastel-foreground/55 aspect-square rounded-[4px]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

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
  /** The UI fragment. Illustrative, so hidden from assistive tech; `points`
      carries the meaning. */
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

function FragmentLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-xs">{children}</p>;
}

/** Day 12 of 14: an early miss, then a run, with two days still to come. */
const CARD_CHAIN = [
  "kept", "missed", "kept", "kept", "kept", "kept", "kept",
  "kept", "kept", "kept", "kept", "kept", "upcoming", "upcoming",
] as const;

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

            {/* The live demo, flanked by other challenges someone might run.
                The side cards sink below the band's edge, so the row reads as
                a stack of cards rather than a grid. */}
            <div className="animate-in fade-in slide-in-from-bottom-8 mt-14 flex items-end justify-center gap-4 pb-14 duration-1000 sm:mt-16 lg:gap-5">
                <ExampleCard
                  title="Meditate 10 minutes"
                  streak={5}
                  unit="day streak"
                  pastel="sky"
                  className="hidden h-60 w-44 translate-y-36 opacity-70 xl:flex"
                />
                <ExampleCard
                  title="Run 5k on Saturdays"
                  streak={3}
                  unit="week streak"
                  pastel="amber"
                  className="hidden h-72 w-52 translate-y-24 lg:flex"
                />
              <div className="w-full max-w-sm shrink-0">
                <HeroPreview />
                <p className="text-ink-subtle mt-4 text-xs">
                  Go on, log the open day. It&apos;s the real check-in.
                </p>
              </div>
                <ExampleCard
                  title="No phone after 10pm"
                  streak={6}
                  unit="day streak"
                  pastel="mint"
                  className="hidden h-72 w-52 translate-y-24 lg:flex"
                />
                <ExampleCard
                  title="Write 300 words"
                  streak={9}
                  unit="day streak"
                  pastel="lavender"
                  className="hidden h-60 w-44 translate-y-36 opacity-70 xl:flex"
                />
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
                  <FragmentLabel>What is your challenge?</FragmentLabel>
                  <p className="border-input mt-2 rounded-xl border px-3.5 py-2.5 text-[15px]">
                    Read 20 pages a day
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
                    <span className="bg-foreground text-background rounded-full px-3 py-1.5">
                      Every day
                    </span>
                    {["Weekdays", "Weekly", "28 days"].map((o) => (
                      <span
                        key={o}
                        className="border-input rounded-full border px-3 py-1.5"
                      >
                        {o}
                      </span>
                    ))}
                  </div>
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
                  <FragmentLabel>What&apos;s on the line?</FragmentLabel>
                  <p className="mt-2 font-serif text-[1.75rem] leading-[1.15] italic">
                    Lunch on me if I miss a day
                  </p>
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
                  <FragmentLabel>Invite your buddy</FragmentLabel>
                  <div className="border-input mt-2 flex items-center gap-2 rounded-full border py-1.5 pr-1.5 pl-4 text-sm">
                    <span className="text-muted-foreground min-w-0 flex-1 truncate">
                      habitual-app-kappa.vercel.app/i/c2749bec
                    </span>
                    <span className="bg-foreground text-background rounded-full px-3.5 py-1.5 text-[13px]">
                      Copy
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
                    <span className="bg-pastel-amber text-pastel-foreground rounded-full px-3 py-1.5">
                      Sam cheered you on
                    </span>
                    <span className="bg-pastel-amber text-pastel-foreground rounded-full px-3 py-1.5">
                      Alex nudged you
                    </span>
                  </div>
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
                  <FragmentLabel>Read 20 pages a day · day 12 of 14</FragmentLabel>
                  <div className="mt-3 grid grid-cols-14 gap-1">
                    {CARD_CHAIN.map((state, i) => (
                      <span
                        key={i}
                        className={cn(
                          "aspect-square rounded-[4px]",
                          state === "kept" && "bg-success",
                          state === "missed" && "cell-missed",
                          state === "upcoming" && "ring-border ring-1 ring-inset",
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-success-ink mt-3 text-sm font-medium">
                    Day 12 logged. 20 pages read.
                  </p>
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

      <footer className="band-ink border-ink-line border-t">
        <div className="text-ink-subtle mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-5 py-8 text-sm sm:flex-row sm:justify-between sm:px-8">
          <div className="text-ink-foreground flex items-center gap-2">
            <LogoGlyph className="h-4 w-auto shrink-0" />
            <span className="tracking-[-0.02em]">Habitual</span>
          </div>
          <nav aria-label="Footer" className="flex items-center gap-6">
            <a
              href="#how-it-works"
              className="hover:text-ink-foreground rounded-sm transition-colors"
            >
              How it works
            </a>
            <a
              href="#faq"
              className="hover:text-ink-foreground rounded-sm transition-colors"
            >
              FAQ
            </a>
            <Link
              href="/login"
              className="hover:text-ink-foreground rounded-sm transition-colors"
            >
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
