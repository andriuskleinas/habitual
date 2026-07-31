"use client";

import { useState } from "react";
import { Check, Flame, Hand, PartyPopper, RotateCcw } from "lucide-react";
import { celebrateCheckIn } from "@/lib/confetti";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The payoff screen — and a working miniature of the product.
 *
 * Static markup rather than a screenshot so it stays sharp, themeable and
 * text-selectable. It's also *live*: the visitor can log the open slot and watch
 * the chain grow, the streak tick over and a buddy react. Explaining the loop
 * costs a paragraph nobody reads; letting someone close it themselves takes one
 * tap, and it's the same confetti the real check-in fires.
 *
 * Illustrative throughout — the numbers are sample data, not an account.
 */

/** Thirteen elapsed slots: one early miss, then an unbroken run. */
const HISTORY = [
  true, false, true, true, true, true, true,
  true, true, true, true, true, true,
];

const DONE_BEFORE = HISTORY.filter(Boolean).length; // 12
const TOTAL_SLOTS = HISTORY.length + 1; // the 14th is today, and it's yours
const STREAK_BEFORE = 11; // the run since the miss at index 1

export function HeroPreview() {
  const [checked, setChecked] = useState(false);

  const streak = checked ? STREAK_BEFORE + 1 : STREAK_BEFORE;
  const done = checked ? DONE_BEFORE + 1 : DONE_BEFORE;
  const percent = Math.round((done / TOTAL_SLOTS) * 100);

  function logToday() {
    setChecked(true);
    void celebrateCheckIn(streak + 1);
  }

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Brand glow sitting behind the card */}
      <div
        className="brand-glow pointer-events-none absolute -inset-12 -z-10 blur-2xl"
        aria-hidden
      />

      <div className="bg-card ring-foreground/10 relative rounded-3xl p-3 shadow-xl ring-1 sm:p-4">
        {/* Streak hero */}
        <div
          className={cn(
            "flex flex-col gap-4 rounded-2xl bg-gradient-to-br p-4 ring-1 transition-colors duration-500",
            checked
              ? "ring-success/25 from-success/12 via-success/5 to-transparent"
              : "ring-primary/15 from-primary/10 via-primary/5 to-transparent",
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors duration-500",
                checked
                  ? "bg-success/15 text-success-ink"
                  : "bg-primary/10 text-primary",
              )}
            >
              <Flame className="size-6" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col">
              <div className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "text-4xl leading-none font-bold tabular-nums transition-colors duration-500",
                    checked ? "text-success-ink" : "text-primary",
                  )}
                >
                  {streak}
                </span>
                <span className="text-muted-foreground text-sm">day streak</span>
              </div>
              <p className="text-muted-foreground mt-1 truncate text-xs">
                Read 20 pages a day
              </p>
            </div>
            <span
              className={cn(
                "bg-background/70 ml-auto inline-flex shrink-0 items-center gap-1 self-start rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors duration-500",
                checked
                  ? "text-success-ink ring-success/30"
                  : "text-muted-foreground ring-foreground/10",
              )}
            >
              {checked ? (
                <>
                  <Check className="size-3" aria-hidden />
                  Today
                </>
              ) : (
                "Today’s open"
              )}
            </span>
          </div>

          {/* Two weeks of check-ins — the "don't break the chain" visual.
              One unbroken row reads as a chain; a 7-col week grid at this width
              stretched the cells into pills. */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-14 gap-1.5">
              {HISTORY.map((day, i) => (
                <span
                  key={i}
                  className={
                    day
                      ? "bg-success animate-cell-pop aspect-square rounded-[5px]"
                      : "bg-muted-foreground/15 aspect-square rounded-[5px]"
                  }
                  // Staggered so the chain "fills in" on load.
                  style={day ? { animationDelay: `${i * 45}ms` } : undefined}
                />
              ))}
              {/* Today's slot. Empty and outlined until it's earned. */}
              <span
                className={
                  checked
                    ? "bg-success animate-cell-pop aspect-square rounded-[5px]"
                    : "ring-primary/50 aspect-square rounded-[5px] ring-2"
                }
              />
            </div>
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span className="tabular-nums">
                {done} / {TOTAL_SLOTS} days
              </span>
              <span className="tabular-nums">{percent}%</span>
            </div>
          </div>

          {/* The loop, closable. A polite live region so the streak change is
              announced rather than only seen. */}
          {/* Fixed height so logging doesn't shrink the card under the
              pointer that just clicked it. */}
          <div className="flex h-12 items-center gap-2">
            {checked ? (
              <>
                <p
                  className="text-success-ink flex min-w-0 items-center gap-1.5 text-sm font-medium"
                  role="status"
                >
                  <Check className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">
                    Logged — {streak} days in a row.
                  </span>
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground ml-auto shrink-0"
                  onClick={() => setChecked(false)}
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                  Again
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={logToday}
              >
                <Check className="size-4" aria-hidden />
                Check in for today
              </Button>
            )}
          </div>
        </div>

        {/* Buddy reaction — the social payoff, and the reason the slot above
            doesn't stay empty. Amber either way: a nudge and a cheer are the
            same voice, just at different moments. */}
        <div className="mt-3 flex items-start gap-2.5 px-1 pb-1">
          <span className="bg-cheer/20 text-cheer-ink flex size-8 shrink-0 items-center justify-center rounded-full">
            {checked ? (
              <PartyPopper className="size-4" aria-hidden />
            ) : (
              <Hand className="size-4" aria-hidden />
            )}
          </span>
          <p className="text-sm text-pretty">
            <span className="font-medium">Sam</span>{" "}
            <span className="text-muted-foreground">
              {checked
                ? "cheered you on — “12 days straight, don’t stop!”"
                : "nudged you — “day 12 won’t log itself.”"}
            </span>
          </p>
        </div>
      </div>

      {/* Floating stake chip, overlapping the card corner for depth. */}
      <div className="bg-card ring-foreground/10 animate-drift absolute -right-2 -bottom-5 hidden items-center gap-2 rounded-xl px-3 py-2 shadow-lg ring-1 sm:flex">
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
