"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { celebrateCheckIn } from "@/lib/confetti";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The payoff screen, and a working miniature of the product.
 *
 * Static markup rather than a screenshot so it stays sharp, themeable and
 * text-selectable. It's also *live*: the visitor can log the open slot and watch
 * the chain grow, the streak tick over and a buddy react. Letting someone close
 * the loop themselves takes one tap, and it's the same confetti the real
 * check-in fires.
 *
 * One surface, no nested cards: the streak number is the loudest thing on it,
 * the chain is the only colour, and the stake and buddy sit underneath as two
 * quiet lines.
 *
 * Illustrative throughout. The numbers are sample data, not an account.
 */

/** Thirteen elapsed slots: one early miss, then an unbroken run. */
const HISTORY = [
  true, false, true, true, true, true, true,
  true, true, true, true, true, true,
];

const DONE_BEFORE = HISTORY.filter(Boolean).length; // 12
const TOTAL_SLOTS = HISTORY.length + 1; // the 14th is today, and it's yours
const STREAK_BEFORE = 11; // the run since the miss at index 1

export function HeroPreview({ className }: { className?: string }) {
  const [checked, setChecked] = useState(false);

  const streak = checked ? STREAK_BEFORE + 1 : STREAK_BEFORE;
  const done = checked ? DONE_BEFORE + 1 : DONE_BEFORE;

  function logToday() {
    setChecked(true);
    void celebrateCheckIn(streak + 1);
  }

  return (
    <div
      className={cn(
        "bg-card text-card-foreground w-full rounded-[28px] p-5 text-left shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] sm:p-6",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-[17px] tracking-[-0.02em]">
          Read 20 pages a day
        </p>
        <p className="text-muted-foreground shrink-0 text-xs tabular-nums">
          Day 14 of 14
        </p>
      </div>

      <p className="mt-4 flex items-baseline gap-2.5">
        {/* Sans, not the serif: Instrument Serif's "1" has no flag, so 11
            reads as "ll" at this size. */}
        <span className="text-success-ink text-7xl leading-[0.85] tracking-[-0.05em] tabular-nums">
          {streak}
        </span>
        <span className="text-muted-foreground text-[15px]">day streak</span>
      </p>

      {/* Two weeks of check-ins: the "don't break the chain" visual. */}
      <div className="mt-5 grid grid-cols-14 gap-1" aria-hidden>
        {HISTORY.map((day, i) => (
          <span
            key={i}
            className={
              day
                ? "bg-success animate-cell-pop aspect-square rounded-[4px]"
                : "cell-missed aspect-square rounded-[4px]"
            }
            // Staggered so the chain fills in on load.
            style={day ? { animationDelay: `${i * 45}ms` } : undefined}
          />
        ))}
        {/* Today's slot. Empty and outlined until it's earned. */}
        <span
          className={
            checked
              ? "bg-success animate-cell-pop aspect-square rounded-[4px]"
              : "ring-primary aspect-square rounded-[4px] ring-[1.5px] ring-inset"
          }
        />
      </div>
      <div className="text-muted-foreground mt-2 flex justify-between text-[11px] tabular-nums">
        <span>Two weeks ago</span>
        <span>
          {done} of {TOTAL_SLOTS} kept
        </span>
      </div>

      {/* Fixed height so logging doesn't shrink the card under the pointer
          that just clicked it. A polite live region announces the change. */}
      <div className="mt-5 flex h-12 items-center gap-2">
        {checked ? (
          <>
            <p
              className="text-success-ink flex min-w-0 items-center gap-1.5 text-sm font-medium"
              role="status"
            >
              <Check className="size-4 shrink-0" aria-hidden />
              <span className="truncate">Logged. {streak} days in a row.</span>
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
            size="xl"
            className="w-full"
            onClick={logToday}
          >
            <Check className="size-5" aria-hidden />
            Check in for today
          </Button>
        )}
      </div>

      {/* The stake and the buddy, as two quiet lines. Amber labels: the stake
          and a buddy's voice share the "someone's holding you to it" colour. */}
      <dl className="border-border mt-5 grid gap-2 border-t pt-4 text-[13px]">
        <div className="flex gap-3">
          <dt className="text-cheer-ink w-14 shrink-0 pt-px text-[11px] font-medium tracking-[0.08em] uppercase">
            Stake
          </dt>
          <dd className="text-muted-foreground">Lunch on me if I miss a day</dd>
        </div>
        <div className="flex gap-3">
          <dt className="text-cheer-ink w-14 shrink-0 pt-px text-[11px] font-medium tracking-[0.08em] uppercase">
            Buddy
          </dt>
          <dd className="text-muted-foreground text-pretty">
            <span className="text-foreground font-medium">Sam</span>{" "}
            {checked
              ? "cheered you on: “12 days straight, don’t stop!”"
              : "nudged you: “day 12 won’t log itself.”"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
