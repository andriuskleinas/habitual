import Link from "next/link";
import {
  ArrowRight,
  Flame,
  HandCoins,
  PartyPopper,
  Target,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Target,
    title: "Set a daily challenge",
    body: "Pick a habit, a target, and how long you'll go for.",
  },
  {
    icon: HandCoins,
    title: "Put a stake on it",
    body: "“Lunch on me if I bail.” Real stakes make it stick.",
  },
  {
    icon: Users,
    title: "Invite a buddy",
    body: "One link. They watch your progress live — no account needed.",
  },
  {
    icon: Flame,
    title: "Log daily, keep the streak",
    body: "Every check-in grows your streak and gets you cheered on.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <header className="flex items-center gap-2">
        <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
          <Flame className="size-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Habitual</span>
      </header>

      {/* Hero */}
      <section className="mt-14 flex flex-col items-start gap-5">
        <Badge variant="secondary" className="rounded-full">
          Accountability, gamified
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-balance">
          Build habits with a{" "}
          <span className="text-primary">buddy watching.</span>
        </h1>
        <p className="text-muted-foreground text-lg text-pretty">
          Set a daily challenge, put something on the line, and invite a friend
          to hold you to it. Habits stick when someone&apos;s watching.
        </p>
      </section>

      {/* App preview — the payoff screen, so visitors see what they'll get */}
      <section className="mt-10">
        <div className="ring-foreground/10 bg-card relative overflow-hidden rounded-3xl p-4 shadow-sm ring-1">
          <div className="ring-primary/15 flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-primary/12 via-primary/5 to-transparent p-4 ring-1">
            <div className="flex items-center gap-3">
              <div className="bg-primary/15 text-primary flex size-11 shrink-0 items-center justify-center rounded-2xl">
                <Flame className="size-6" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-primary text-3xl leading-none font-bold tabular-nums">
                    5
                  </span>
                  <span className="text-muted-foreground text-sm">days</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  Read 20 pages a day
                </p>
              </div>
              <span className="text-primary ring-primary/20 ml-auto self-start rounded-full bg-background/70 px-2.5 py-1 text-xs font-medium whitespace-nowrap ring-1">
                Today ✓
              </span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div className="bg-primary h-full w-[62%] rounded-full" />
            </div>
          </div>

          {/* A buddy cheer, to sell the social payoff */}
          <div className="mt-3 flex items-center gap-2.5 px-1">
            <div className="bg-accent text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
              <PartyPopper className="size-4" />
            </div>
            <p className="text-sm text-pretty">
              <span className="font-medium">Sam</span>{" "}
              <span className="text-muted-foreground">
                cheered you on — &ldquo;5 days straight, don&apos;t stop!&rdquo;
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Primary CTA */}
      <section className="mt-8 flex flex-col gap-3">
        <Button size="lg" className="w-full" asChild>
          <Link href="/login">
            Start a challenge
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          Sign in with a magic link &mdash; no password needed.
        </p>
      </section>

      {/* How it works */}
      <section className="mt-16 flex flex-col gap-6">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          How it works
        </h2>
        <ol className="flex flex-col gap-5">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex items-start gap-4">
              <div className="relative flex flex-col items-center">
                <div className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="size-5" />
                </div>
                {i < steps.length - 1 && (
                  <span className="bg-border mt-1 h-6 w-px" aria-hidden />
                )}
              </div>
              <div className="flex flex-col gap-0.5 pt-1.5">
                <p className="font-medium">
                  <span className="text-muted-foreground tabular-nums">
                    {i + 1}.
                  </span>{" "}
                  {title}
                </p>
                <p className="text-muted-foreground text-sm text-pretty">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Why it works */}
      <section className="mt-14">
        <div className="ring-foreground/10 bg-accent/40 flex flex-col gap-2 rounded-2xl px-5 py-5 ring-1">
          <p className="text-base font-semibold text-balance">
            Going to the gym with a friend beats going alone.
          </p>
          <p className="text-muted-foreground text-sm text-pretty">
            A watching buddy and a real stake turn &ldquo;I&apos;ll start
            Monday&rdquo; into a streak you don&apos;t want to break.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mt-10 flex flex-col gap-3">
        <Button size="lg" className="w-full" asChild>
          <Link href="/login">
            Start your first streak
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>

      <footer className="text-muted-foreground mt-auto pt-16 text-center text-xs">
        Habitual &middot; habits stick when someone&apos;s watching
      </footer>
    </main>
  );
}
