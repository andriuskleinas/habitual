import {
  addDays,
  diffDays,
  formatDay,
  periodStates,
  recentWindow,
  weekdayOf,
  type Period,
  type PeriodState,
} from "@/lib/challenges";
import { cn } from "@/lib/utils";

/**
 * The chain: one cell per scheduled check-in, in the same four states
 * everywhere in the app (landing demo, dashboard rows, detail and buddy views).
 *
 *   kept      solid green
 *   missed    outlined, struck through (`.cell-missed`)
 *   now       outlined in indigo: the one slot you can still fill
 *   upcoming  hairline outline
 *
 * Decorative: the same numbers are always stated in text nearby, so the cells
 * are hidden from assistive tech.
 */
const CELL: Record<PeriodState, string> = {
  kept: "bg-success text-white/90",
  missed: "cell-missed text-muted-foreground",
  now: "ring-primary text-primary ring-2 ring-inset font-semibold",
  upcoming: "ring-border text-muted-foreground ring-1 ring-inset",
};

/**
 * At row size a diagonal stroke turns into noise: a run of misses reads as a
 * hatched texture rather than as missed days. Small chains fill a miss with a
 * faint red instead; the full calendar keeps the stroke, where it's legible.
 */
const CELL_COMPACT: Partial<Record<PeriodState, string>> = {
  missed: "bg-destructive/15",
};

/** Calendars past this many weeks get too tall; longer runs use the grid. */
const MAX_CALENDAR_WEEKS = 14;

const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * The full chain for one challenge. Day-by-day schedules of up to fourteen
 * weeks render as a calendar (weekday columns, dates in the cells), so a miss
 * reads as "last Tuesday" and the days left are countable. Longer or
 * block-based schedules (weekly, monthly) fall back to a plain grid.
 */
export function ChainGrid({
  periods,
  done,
  today,
  legend = false,
  className,
}: {
  periods: Period[];
  done: Set<string>;
  today: string;
  /** Show the colour key. Worth it for a first-time viewer, noise for the owner. */
  legend?: boolean;
  className?: string;
}) {
  const states = periodStates(periods, done, today);
  const singleDay = periods.every((p) => p.start === p.end);
  const first = periods[0]?.start;
  const last = periods.at(-1)?.end;
  const weeks =
    first && last ? Math.ceil((diffDays(first, last) + 1) / 7) + 1 : 0;
  const asCalendar = singleDay && first && weeks <= MAX_CALENDAR_WEEKS;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {asCalendar ? (
        <Calendar periods={periods} states={states} today={today} />
      ) : (
        <div
          className="grid grid-cols-10 gap-1.5 sm:grid-cols-15"
          aria-hidden
        >
          {periods.slice(0, 150).map((p, i) => (
            <span
              key={p.start}
              title={p.start === p.end ? formatDay(p.start) : `${formatDay(p.start)} – ${formatDay(p.end)}`}
              className={cn("aspect-square rounded-[5px]", CELL[states[i]])}
            />
          ))}
        </div>
      )}

      {legend && (
        <ul className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          <LegendKey state="kept">Kept</LegendKey>
          <LegendKey state="missed">Missed</LegendKey>
          <LegendKey state="now">Today</LegendKey>
          <LegendKey state="upcoming">To come</LegendKey>
        </ul>
      )}
    </div>
  );
}

function Calendar({
  periods,
  states,
  today,
}: {
  periods: Period[];
  states: PeriodState[];
  today: string;
}) {
  const byDate = new Map(periods.map((p, i) => [p.start, states[i]]));
  const first = periods[0].start;
  const last = periods.at(-1)!.end;
  // Monday-start weeks: back up to the Monday on or before the first day.
  const lead = (weekdayOf(first) + 6) % 7;
  const start = addDays(first, -lead);
  const span = diffDays(start, last) + 1;
  const cells = Math.ceil(span / 7) * 7;

  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-hidden>
      {WEEKDAY_INITIALS.map((d, i) => (
        <span
          key={i}
          className="text-muted-foreground pb-0.5 text-center text-[11px]"
        >
          {d}
        </span>
      ))}
      {Array.from({ length: cells }, (_, i) => {
        const date = addDays(start, i);
        const state = byDate.get(date);
        const day = Number(date.slice(8));
        // The month name rides on the first cell and on every 1st, so a
        // calendar that crosses a month boundary says so.
        const label =
          i === lead || day === 1
            ? formatDay(date).replace(/ /, " ")
            : String(day);

        if (!state) {
          // Outside the challenge, or a day the cadence skips (weekends on a
          // weekdays challenge): keep the column, draw nothing.
          return <span key={date} className="aspect-[1.5]" />;
        }
        return (
          <span
            key={date}
            title={formatDay(date, { weekday: true })}
            className={cn(
              "relative aspect-[1.5] rounded-lg p-1.5 text-[11px] leading-none tabular-nums sm:p-2 sm:text-xs",
              CELL[state],
              date === today && state === "kept" && "ring-success-ink ring-2 ring-inset",
            )}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

/**
 * A row-sized chain: the fourteen periods ending with the current one. Used on
 * dashboard rows, where every challenge should be the same width whether it
 * runs for a week or a year.
 */
export function MiniChain({
  periods,
  done,
  today,
  className,
}: {
  periods: Period[];
  done: Set<string>;
  today: string;
  className?: string;
}) {
  const states = recentWindow(periods, periodStates(periods, done, today), today);
  return (
    <div
      className={cn("grid grid-cols-14 gap-[3px]", className)}
      aria-hidden
    >
      {states.map((s, i) => (
        <span
          key={i}
          className={cn("aspect-square rounded-[3px]", CELL_COMPACT[s] ?? CELL[s])}
        />
      ))}
      {/* Pad short schedules so every row's chain is the same width. */}
      {Array.from({ length: Math.max(0, 14 - states.length) }, (_, i) => (
        <span key={`pad-${i}`} />
      ))}
    </div>
  );
}

function LegendKey({
  state,
  children,
}: {
  state: PeriodState;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded-[3px]", CELL[state])} aria-hidden />
      {children}
    </li>
  );
}
