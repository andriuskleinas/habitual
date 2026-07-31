/**
 * Pure helpers for challenge math: dates, cadences, streaks, and progress.
 *
 * Dates are handled as UTC calendar days (`YYYY-MM-DD` strings) so that the
 * value we insert as a check-in date and the value we compare against when
 * computing streaks are always derived the same way. Good enough for the MVP;
 * true per-user timezone handling is a later refinement.
 *
 * Everything downstream is expressed in **periods** rather than raw days. A
 * period is one slot the challenge asks you to fill: a single day for "every
 * day", a whole week for "once a week", a month for "once a month". That one
 * abstraction gives streaks, progress, and misses the same meaning at every
 * cadence — "4 of 12 weeks" reads as well as "12 of 30 days".
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

/**
 * Add `n` calendar months, clamping to the end of a short month so that
 * Jan 31 + 1 month is Feb 28/29 rather than spilling into March.
 */
export function addMonths(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const lastDay = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

/** Inclusive whole-day difference `b - a` (both `YYYY-MM-DD`). */
export function diffDays(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00.000Z`).getTime();
  const db = new Date(`${b}T00:00:00.000Z`).getTime();
  return Math.round((db - da) / 86_400_000);
}

/** Day of week for a `YYYY-MM-DD` date. 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

/* -------------------------------------------------------------------------- */
/*  Cadence                                                                    */
/* -------------------------------------------------------------------------- */

/** Cadence options offered in the create form. Stored as the value string. */
export const CADENCES = [
  { value: "daily", label: "Every day", short: "Every day" },
  { value: "weekdays", label: "Weekdays (Mon–Fri)", short: "Weekdays" },
  { value: "weekly", label: "Once a week — any day", short: "Once a week" },
  { value: "weekly_on", label: "Once a week — on a set day", short: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks", short: "Every 2 weeks" },
  { value: "monthly", label: "Once a month", short: "Once a month" },
] as const;

export type Cadence = (typeof CADENCES)[number]["value"];

/** Cadences that need a weekday picked alongside them. */
export function cadenceNeedsWeekday(cadence: string): boolean {
  return cadence === "weekly_on";
}

/** Weekday options, Monday-first for the picker. Values match `getUTCDay()`. */
export const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
] as const;

export function weekdayLabel(value: number | null | undefined): string {
  return WEEKDAYS.find((d) => d.value === value)?.label ?? "Monday";
}

/** Human label for a stored cadence, e.g. `weekly_on` + 3 → "Every Wednesday". */
export function cadenceLabel(
  cadence: string,
  weekday?: number | null,
): string {
  if (cadence === "weekly_on") return `Every ${weekdayLabel(weekday)}`;
  return CADENCES.find((c) => c.value === cadence)?.short ?? cadence;
}

/** What one slot of this cadence is called, for "3 weeks in a row"-style copy. */
export function periodNoun(cadence: string): { one: string; many: string } {
  switch (cadence) {
    case "weekly":
    case "weekly_on":
      return { one: "week", many: "weeks" };
    case "biweekly":
      return { one: "fortnight", many: "fortnights" };
    case "monthly":
      return { one: "month", many: "months" };
    default:
      return { one: "day", many: "days" };
  }
}

/** Duration presets offered in the create form, in calendar days. */
export const DURATIONS = [
  { days: 7, label: "1 week" },
  { days: 14, label: "2 weeks" },
  { days: 21, label: "3 weeks" },
  { days: 28, label: "4 weeks" },
  { days: 66, label: "66 days (becomes a habit)" },
  { days: 90, label: "3 months" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
] as const;

export function durationLabel(days: number): string {
  return DURATIONS.find((d) => d.days === days)?.label ?? `${days} days`;
}

/** Start-date presets. Resolved server-side so we never trust the client clock. */
export const START_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "monday", label: "Next Monday" },
] as const;

export type StartOption = (typeof START_OPTIONS)[number]["value"];

/** Resolve a start preset against a reference day (defaults to today, UTC). */
export function resolveStartDate(
  option: string,
  today: string = todayISO(),
): string {
  if (option === "tomorrow") return addDays(today, 1);
  if (option === "monday") {
    // Always the *next* Monday — picking Monday on a Monday means next week.
    const ahead = (8 - weekdayOf(today)) % 7 || 7;
    return addDays(today, ahead);
  }
  return today;
}

/* -------------------------------------------------------------------------- */
/*  Periods                                                                    */
/* -------------------------------------------------------------------------- */

/** One slot the challenge asks you to fill. Both bounds inclusive. */
export type Period = { start: string; end: string };

/** Safety valve so a long open-ended challenge can't generate unbounded work. */
const MAX_PERIODS = 400;

/**
 * The schedule a challenge implies, as a list of periods.
 *
 * Single-day cadences (daily, weekdays, a set weekday) produce one period per
 * qualifying date. Block cadences (weekly, fortnightly, monthly) produce rolling
 * blocks anchored on the start date, and any trailing *partial* block is
 * dropped — a challenge that ends two days into week five doesn't get to demand
 * a fifth check-in.
 */
export function schedulePeriods(opts: {
  cadence: string;
  cadenceWeekday?: number | null;
  startDate: string;
  endDate: string | null;
  /** Horizon for open-ended challenges. */
  today?: string;
}): Period[] {
  const { cadence, cadenceWeekday, startDate } = opts;
  const today = opts.today ?? todayISO();
  const horizon = opts.endDate ?? (diffDays(startDate, today) > 0 ? today : startDate);
  if (diffDays(startDate, horizon) < 0) return [];

  const periods: Period[] = [];

  if (cadence === "weekly" || cadence === "biweekly" || cadence === "monthly") {
    const step = cadence === "weekly" ? 7 : cadence === "biweekly" ? 14 : 0;
    for (let i = 0; periods.length < MAX_PERIODS; i++) {
      const start =
        step > 0 ? addDays(startDate, i * step) : addMonths(startDate, i);
      const end =
        step > 0
          ? addDays(start, step - 1)
          : addDays(addMonths(startDate, i + 1), -1);
      // Only whole blocks count.
      if (diffDays(end, horizon) < 0) break;
      periods.push({ start, end });
    }
    return periods;
  }

  const total = diffDays(startDate, horizon) + 1;
  for (let i = 0; i < total && periods.length < MAX_PERIODS; i++) {
    const date = addDays(startDate, i);
    const dow = weekdayOf(date);
    if (cadence === "weekdays" && (dow === 0 || dow === 6)) continue;
    if (cadence === "weekly_on" && dow !== (cadenceWeekday ?? 1)) continue;
    periods.push({ start: date, end: date });
  }
  return periods;
}

/* -------------------------------------------------------------------------- */
/*  Allowance ("wiggle room")                                                  */
/* -------------------------------------------------------------------------- */

export type AllowanceMode = "count" | "percent";

/**
 * How many misses this challenge tolerates in total.
 * `null` in / `null` out means unlimited — the challenge can't be failed on
 * volume, only (maybe) on a back-to-back run.
 */
export function resolveSkipsAllowed(
  mode: string | null | undefined,
  value: number | null | undefined,
  totalPeriods: number | null,
): number | null {
  if (value === null || value === undefined) return null;
  if (mode === "count") return value;
  if (mode !== "percent" || totalPeriods === null) return null;
  return Math.floor((totalPeriods * value) / 100);
}

/* -------------------------------------------------------------------------- */
/*  Evaluation                                                                 */
/* -------------------------------------------------------------------------- */

export type ChallengeRules = {
  cadence: string;
  cadenceWeekday?: number | null;
  startDate: string;
  endDate: string | null;
  /** `count` | `percent`; anything else (or null) means unlimited skips. */
  allowanceMode?: string | null;
  allowanceValue?: number | null;
  maxMissesInRow?: number | null;
  /** Per-check-in target. > 1 means "hit this number every time". */
  dailyTarget?: number | null;
  /** Cumulative goal across the whole run. Set = this is a total challenge. */
  totalTarget?: number | null;
};

/** A check-in, as far as scoring cares. */
export type CheckInLike = { date: string; value?: number | null };

export type ChallengeStatus = "upcoming" | "active" | "won" | "failed";

/**
 * How a challenge is measured.
 * - `tick`  — done / not done
 * - `each`  — hit a number every check-in
 * - `total` — reach a cumulative number by the end; skipped days can be made up
 */
export type GoalMode = "tick" | "each" | "total";

export function goalMode(opts: {
  dailyTarget?: number | null;
  totalTarget?: number | null;
}): GoalMode {
  if (opts.totalTarget) return "total";
  return (opts.dailyTarget ?? 1) > 1 ? "each" : "tick";
}

export type ChallengeEval = {
  /** Total planned periods, or null for an open-ended challenge. */
  totalPeriods: number | null;
  /** Periods with at least one check-in. */
  donePeriods: number;
  /** Periods that have fully elapsed. */
  closedPeriods: number;
  /** Elapsed periods with nothing logged. */
  missedPeriods: number;
  /** Periods still to come (>= 0), or null if open-ended. */
  periodsRemaining: number | null;
  /** 0–100 completion of the plan, or null if open-ended. */
  percent: number | null;
  /** Whole days left until end_date (>= 0), or null if open-ended. */
  daysRemaining: number | null;
  /** Consecutive filled periods ending now. */
  streak: number;
  /** Longest run of filled periods anywhere in the history. */
  bestStreak: number;
  /** Misses tolerated in total, or null for unlimited. */
  skipsAllowed: number | null;
  /** Misses still in the bank (>= 0), or null for unlimited. */
  skipsLeft: number | null;
  /** Longest back-to-back run of misses so far. */
  worstMissRun: number;
  /** Longest back-to-back run still allowed, or null if the rule is off. */
  maxMissesInRow: number | null;
  status: ChallengeStatus;
  failReason: "skips" | "in-a-row" | "total" | null;
  /** True if the period covering today has nothing logged yet. */
  dueNow: boolean;
  /** True once the end date has passed. */
  isEnded: boolean;
  /** How this challenge is measured. */
  mode: GoalMode;
  /** Cumulative goal, or null when measured per check-in. */
  totalTarget: number | null;
  /** Everything logged so far, summed. */
  totalLogged: number;
  /** Still to go on the cumulative goal (>= 0), or null. */
  totalRemaining: number | null;
  /**
   * Logged minus what an even pace would have produced by now — the number that
   * makes a compounding goal legible. Positive is ahead. Null unless `total`.
   */
  pace: number | null;
  /** Even-pace amount per remaining check-in to still finish, or null. */
  perCheckInToFinish: number | null;
};

/**
 * Score a challenge against its own rules.
 *
 * A period is *missed* only once it has fully elapsed, so an unfilled period
 * that's still running never counts against you — the streak and the skip
 * budget only move when a slot is genuinely gone.
 *
 * On a `total` challenge the cumulative number is the real scoreboard: hitting
 * it wins immediately (even early), and finishing short is what fails you.
 */
export function evaluateChallenge(
  rules: ChallengeRules,
  checkIns: CheckInLike[],
  today: string = todayISO(),
): ChallengeEval {
  const { startDate, endDate } = rules;
  const periods = schedulePeriods({ ...rules, today });
  const days = new Set(checkIns.map((c) => c.date));

  const filled = periods.map((p) =>
    p.start === p.end
      ? days.has(p.start)
      : checkIns.some(
          (c) =>
            diffDays(p.start, c.date) >= 0 && diffDays(c.date, p.end) >= 0,
        ),
  );
  const closed = periods.map((p) => diffDays(p.end, today) > 0);

  const donePeriods = filled.filter(Boolean).length;
  const closedPeriods = closed.filter(Boolean).length;
  const missedPeriods = periods.reduce(
    (n, _, i) => n + (closed[i] && !filled[i] ? 1 : 0),
    0,
  );

  // Streak: count back from the newest period that has started. An unfilled
  // *current* period doesn't break it — we fall back one slot, so the number
  // only resets once a period has genuinely been let go.
  let cursor = periods.length - 1;
  while (cursor >= 0 && diffDays(periods[cursor].start, today) < 0) cursor -= 1;
  if (cursor >= 0 && !filled[cursor]) cursor -= 1;
  let streak = 0;
  while (cursor >= 0 && filled[cursor]) {
    streak += 1;
    cursor -= 1;
  }

  let bestStreak = 0;
  let run = 0;
  for (const ok of filled) {
    run = ok ? run + 1 : 0;
    if (run > bestStreak) bestStreak = run;
  }

  // Worst run of misses, over elapsed periods only.
  let worstMissRun = 0;
  let missRun = 0;
  for (let i = 0; i < periods.length; i++) {
    if (!closed[i]) break;
    missRun = filled[i] ? 0 : missRun + 1;
    if (missRun > worstMissRun) worstMissRun = missRun;
  }

  const totalPeriods = endDate ? periods.length : null;
  const skipsAllowed = resolveSkipsAllowed(
    rules.allowanceMode ?? null,
    rules.allowanceValue ?? null,
    totalPeriods,
  );
  const skipsLeft =
    skipsAllowed === null ? null : Math.max(0, skipsAllowed - missedPeriods);
  const maxMissesInRow = rules.maxMissesInRow ?? null;

  const brokeSkips = skipsAllowed !== null && missedPeriods > skipsAllowed;
  const brokeRun = maxMissesInRow !== null && worstMissRun > maxMissesInRow;
  const isEnded = endDate ? diffDays(today, endDate) < 0 : false;
  const hasStarted = diffDays(startDate, today) >= 0;

  // Cumulative scoring. `value` defaults to 1 so a plain tick still adds up.
  const totalTarget = rules.totalTarget ?? null;
  const totalLogged = checkIns.reduce((n, c) => n + (c.value ?? 1), 0);
  const hitTotal = totalTarget !== null && totalLogged >= totalTarget;
  // Pace: what an even spread would have produced by the end of today's slot.
  const elapsedPeriods =
    totalPeriods === null ? closedPeriods : Math.min(closedPeriods + 1, totalPeriods);
  const pace =
    totalTarget === null || !totalPeriods
      ? null
      : Math.round(totalLogged - (totalTarget * elapsedPeriods) / totalPeriods);
  const periodsLeft =
    totalPeriods === null ? null : Math.max(0, totalPeriods - closedPeriods);
  const totalRemaining =
    totalTarget === null ? null : Math.max(0, totalTarget - totalLogged);

  const status: ChallengeStatus = brokeSkips || brokeRun
    ? "failed"
    : !hasStarted
      ? "upcoming"
      : hitTotal
        ? "won"
        : isEnded
          ? totalTarget !== null
            ? "failed"
            : "won"
          : "active";

  const currentIndex = periods.findIndex(
    (p) => diffDays(p.start, today) >= 0 && diffDays(today, p.end) >= 0,
  );

  return {
    totalPeriods,
    donePeriods,
    closedPeriods,
    missedPeriods,
    periodsRemaining: periodsLeft,
    // On a total challenge the bar tracks the cumulative number, not the
    // number of slots filled — that's the whole point of the mode.
    percent:
      totalTarget !== null
        ? Math.min(100, Math.round((totalLogged / totalTarget) * 100))
        : totalPeriods === null || totalPeriods === 0
          ? null
          : Math.min(100, Math.round((donePeriods / totalPeriods) * 100)),
    daysRemaining: endDate ? Math.max(0, diffDays(today, endDate)) : null,
    streak,
    bestStreak,
    skipsAllowed,
    skipsLeft,
    worstMissRun,
    maxMissesInRow,
    status,
    failReason: brokeSkips
      ? "skips"
      : brokeRun
        ? "in-a-row"
        : status === "failed"
          ? "total"
          : null,
    dueNow: currentIndex >= 0 && !filled[currentIndex],
    isEnded,
    mode: goalMode({ dailyTarget: rules.dailyTarget, totalTarget }),
    totalTarget,
    totalLogged,
    totalRemaining,
    pace,
    perCheckInToFinish:
      totalRemaining === null || !periodsLeft
        ? null
        : Math.ceil(totalRemaining / periodsLeft),
  };
}

/* -------------------------------------------------------------------------- */
/*  Copy helpers                                                               */
/* -------------------------------------------------------------------------- */

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Thousands separators, because "3000 pages" reads worse than "3,000 pages". */
export function formatCount(n: number, unit?: string | null): string {
  return `${n.toLocaleString("en-US")}${unit ? ` ${unit}` : ""}`;
}

/** "Reach 3,000 pages" / "100 push-ups each time" / "Just tick it off". */
export function describeGoal(opts: {
  dailyTarget?: number | null;
  totalTarget?: number | null;
  unit?: string | null;
}): string {
  const mode = goalMode(opts);
  if (mode === "total") {
    return `reach ${formatCount(opts.totalTarget!, opts.unit)} in total`;
  }
  if (mode === "each") {
    return `${formatCount(opts.dailyTarget!, opts.unit)} each time`;
  }
  return "just tick it off";
}

/** "3 skips allowed, never twice in a row" — the rule stated in one breath. */
export function describeAllowance(opts: {
  skipsAllowed: number | null;
  maxMissesInRow: number | null;
  cadence: string;
}): string {
  const noun = periodNoun(opts.cadence);
  const parts: string[] = [];

  if (opts.skipsAllowed === null) {
    parts.push("Skip as often as you need");
  } else if (opts.skipsAllowed === 0) {
    parts.push("No skips — a perfect run");
  } else {
    parts.push(`${plural(opts.skipsAllowed, "skip", "skips")} allowed`);
  }

  if (opts.maxMissesInRow === 1) {
    parts.push(`never two ${noun.many} in a row`);
  } else if (opts.maxMissesInRow !== null) {
    parts.push(`never ${opts.maxMissesInRow + 1} ${noun.many} in a row`);
  }

  return parts.join(", ") + ".";
}

/** Nicely formatted `YYYY-MM-DD`, e.g. "Mon, Aug 3". */
export function formatDay(
  date: string,
  opts: { weekday?: boolean } = {},
): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", {
    ...(opts.weekday ? { weekday: "short" as const } : {}),
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
