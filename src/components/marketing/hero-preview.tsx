import { Check, Flame, PartyPopper } from "lucide-react";

/**
 * The payoff screen, rendered as static markup rather than a screenshot so it
 * stays sharp, themeable and text-selectable. Purely illustrative — the numbers
 * are sample data, not a real account.
 */

// 14 days of history: one early miss, then 12 unbroken days — which is exactly
// the "12 day streak" and "13 / 14" stated alongside it.
const DAYS = [
  true, false, true, true, true, true, true,
  true, true, true, true, true, true, true,
];

export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Brand glow sitting behind the card */}
      <div
        className="brand-glow pointer-events-none absolute -inset-12 -z-10 blur-2xl"
        aria-hidden
      />

      <div className="bg-card ring-foreground/10 relative rounded-3xl p-3 shadow-xl ring-1 sm:p-4">
        {/* Streak hero */}
        <div className="ring-primary/15 from-primary/12 via-primary/5 flex flex-col gap-4 rounded-2xl bg-gradient-to-br to-transparent p-4 ring-1">
          <div className="flex items-center gap-3">
            <span className="bg-primary/15 text-primary flex size-12 shrink-0 items-center justify-center rounded-2xl">
              <Flame className="size-6" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-primary text-4xl leading-none font-bold tabular-nums">
                  12
                </span>
                <span className="text-muted-foreground text-sm">day streak</span>
              </div>
              <p className="text-muted-foreground mt-1 truncate text-xs">
                Read 20 pages a day
              </p>
            </div>
            <span className="text-primary ring-primary/20 bg-background/70 ml-auto inline-flex shrink-0 items-center gap-1 self-start rounded-full px-2.5 py-1 text-xs font-medium ring-1">
              <Check className="size-3" aria-hidden />
              Today
            </span>
          </div>

          {/* Two weeks of check-ins — the "don't break the chain" visual */}
          <div className="flex flex-col gap-2">
            {/* One unbroken row reads as a chain; a 7-col week grid at this
                width stretched the cells into pills. */}
            <div className="grid grid-cols-14 gap-1.5">
              {DAYS.map((done, i) => (
                <span
                  key={i}
                  className={
                    done
                      ? "bg-primary animate-in fade-in zoom-in-50 fill-mode-backwards aspect-square rounded-[5px] duration-500"
                      : "bg-muted-foreground/15 aspect-square rounded-[5px]"
                  }
                  // Staggered so the chain "fills in" on load.
                  style={done ? { animationDelay: `${i * 45}ms` } : undefined}
                />
              ))}
            </div>
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span className="tabular-nums">13 / 14 days</span>
              <span className="tabular-nums">93%</span>
            </div>
          </div>
        </div>

        {/* Buddy cheer — the social payoff */}
        <div className="mt-3 flex items-start gap-2.5 px-1 pb-1">
          <span className="bg-accent text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
            <PartyPopper className="size-4" aria-hidden />
          </span>
          <p className="text-sm text-pretty">
            <span className="font-medium">Sam</span>{" "}
            <span className="text-muted-foreground">
              cheered you on — &ldquo;12 days straight, don&apos;t stop!&rdquo;
            </span>
          </p>
        </div>
      </div>

      {/* Floating stake chip, overlapping the card corner for depth */}
      <div className="bg-card ring-foreground/10 absolute -right-2 -bottom-5 hidden items-center gap-2 rounded-xl px-3 py-2 shadow-lg ring-1 sm:flex">
        <span className="text-base" aria-hidden>
          🍜
        </span>
        <span className="text-xs font-medium">
          On the line: <span className="text-muted-foreground">lunch on me</span>
        </span>
      </div>
    </div>
  );
}
