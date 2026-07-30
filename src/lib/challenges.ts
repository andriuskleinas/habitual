/**
 * Pure helpers for challenge math: dates, streaks, and progress.
 *
 * Dates are handled as UTC calendar days (`YYYY-MM-DD` strings) so that the
 * value we insert as a check-in date and the value we compare against when
 * computing streaks are always derived the same way. Good enough for the MVP;
 * true per-user timezone handling is a later refinement.
 */

/** Today as a `YYYY-MM-DD` string (UTC). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add `n` calendar days to a `YYYY-MM-DD` date, returning a `YYYY-MM-DD` string. */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Inclusive whole-day difference `b - a` (both `YYYY-MM-DD`). */
export function diffDays(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00.000Z`).getTime();
  const db = new Date(`${b}T00:00:00.000Z`).getTime();
  return Math.round((db - da) / 86_400_000);
}

/**
 * Current streak: consecutive check-in days ending today. An unchecked *today*
 * doesn't break the streak mid-day — we fall back to counting from yesterday so
 * the number only resets once a full day has been genuinely missed.
 */
export function currentStreak(dates: string[], today: string = todayISO()): number {
  const days = new Set(dates);
  let cursor = today;
  if (!days.has(cursor)) {
    cursor = addDays(cursor, -1);
  }
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive check-in days anywhere in the history. */
export function longestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = diffDays(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

export type ChallengeProgress = {
  /** Total planned calendar days, or null for an open-ended challenge. */
  totalDays: number | null;
  /** Distinct days checked in. */
  completedDays: number;
  /** Days elapsed since start (capped at totalDays), 1-based, for pacing. */
  elapsedDays: number;
  /** Whole days left until end_date (>= 0), or null if open-ended. */
  daysRemaining: number | null;
  /** 0–100 completion of the plan, or null if open-ended. */
  percent: number | null;
  /** True once the end date has passed. */
  isEnded: boolean;
};

export function challengeProgress(opts: {
  startDate: string;
  endDate: string | null;
  completedDays: number;
  today?: string;
}): ChallengeProgress {
  const { startDate, endDate, completedDays } = opts;
  const today = opts.today ?? todayISO();

  const totalDays = endDate ? diffDays(startDate, endDate) + 1 : null;
  const elapsedRaw = diffDays(startDate, today) + 1;
  const elapsedDays = totalDays
    ? Math.max(0, Math.min(elapsedRaw, totalDays))
    : Math.max(0, elapsedRaw);
  const daysRemaining = endDate ? Math.max(0, diffDays(today, endDate)) : null;
  const percent = totalDays
    ? Math.min(100, Math.round((completedDays / totalDays) * 100))
    : null;
  const isEnded = endDate ? diffDays(today, endDate) < 0 : false;

  return { totalDays, completedDays, elapsedDays, daysRemaining, percent, isEnded };
}

/** Cadence options offered in the create form. Stored as the value string. */
export const CADENCES = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Once a week" },
] as const;

export type Cadence = (typeof CADENCES)[number]["value"];

export function cadenceLabel(value: string): string {
  return CADENCES.find((c) => c.value === value)?.label ?? value;
}

/** Duration presets (days) offered in the create form. */
export const DURATIONS = [7, 21, 30, 66, 90] as const;
