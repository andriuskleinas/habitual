"use client";

import { useEffect } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { celebrateCheckIn, celebrationKey } from "@/lib/confetti";

/**
 * Replaces the check-in form once today is logged. A day counts once, so this
 * is a receipt, not an editor — the number and the note are shown back exactly
 * as they were recorded, and the next thing offered is the next check-in.
 *
 * It also fires the celebration, because the form that triggered the log has
 * already been unmounted by the time the page revalidates (see `celebrationKey`).
 */
export function TodayDone({
  challengeId,
  date,
  streak,
  streakNoun,
  value,
  note,
  showValue,
  unit,
  nextDue,
}: {
  challengeId: string;
  /** Today, `YYYY-MM-DD`. Matched against the pending-celebration flag. */
  date: string;
  streak: number;
  streakNoun: string;
  value: number;
  note: string | null;
  /** Tick challenges have no meaningful number to show back. */
  showValue: boolean;
  unit?: string | null;
  /** Human date of the next scheduled check-in, if there is one. */
  nextDue: string | null;
}) {
  useEffect(() => {
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(celebrationKey(challengeId));
      if (pending) sessionStorage.removeItem(celebrationKey(challengeId));
    } catch {
      // Blocked storage — no celebration, nothing else to do.
    }
    if (pending === date) void celebrateCheckIn(streak);
  }, [challengeId, date, streak]);

  return (
    <div className="ring-success/25 bg-success/[0.07] flex flex-col items-center gap-3 rounded-2xl px-5 py-7 text-center">
      <span className="bg-success/15 text-success flex size-14 items-center justify-center rounded-2xl">
        <CheckCircle2 className="size-7" aria-hidden />
      </span>

      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold">Today&apos;s done</p>
        <p className="text-muted-foreground text-sm text-pretty">
          {streak > 0
            ? `That's ${streak} ${streakNoun} in a row. Don't break it.`
            : "First one in the books."}
        </p>
      </div>

      {showValue && (
        <p className="text-foreground text-sm font-medium tabular-nums">
          Logged {value.toLocaleString("en-US")}
          {unit ? ` ${unit}` : ""}
        </p>
      )}

      {note && (
        <p className="text-muted-foreground max-w-sm text-sm text-pretty italic">
          &ldquo;{note}&rdquo;
        </p>
      )}

      <p className="text-muted-foreground mt-1 inline-flex items-center gap-1.5 text-xs">
        <Clock className="size-3.5" aria-hidden />
        {nextDue ? `Back again ${nextDue}` : "That was the last one"}
      </p>
    </div>
  );
}
