import { formatDay } from "@/lib/challenges";
import type { Category } from "@/lib/categories";
import { cn } from "@/lib/utils";

/**
 * The dashboard's opening view: how you're doing overall, then where.
 *
 * Every number answers a question someone actually asks of a habit tracker.
 * Am I running anything right now? Do I usually finish? How often do I really
 * show up? Lately? And at what? The last one is the insight a flat list can't
 * give: which kinds of challenge you keep, and which you quietly drop.
 */

export type CategoryStat = {
  category: Category;
  total: number;
  active: number;
  upcoming: number;
  won: number;
  lost: number;
  /** Elapsed slots that were filled / elapsed slots, across the category. */
  kept: number;
  closed: number;
};

export type SummaryData = {
  active: number;
  dueNow: number;
  won: number;
  lost: number;
  kept: number;
  closed: number;
  bestStreak: number;
  currentStreak: number;
  activity: { date: string; count: number }[];
  totalCheckIns: number;
  lastCheckIn: string | null;
  categories: CategoryStat[];
};

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);

export function DashboardSummary({ data }: { data: SummaryData }) {
  const winRate = pct(data.won, data.won + data.lost);
  const consistency = pct(data.kept, data.closed);
  const recent = data.activity.reduce((n, d) => n + d.count, 0);

  return (
    <section aria-label="Summary" className="mt-8 flex flex-col gap-4">
      <div className="bg-muted/60 grid grid-cols-2 rounded-3xl lg:grid-cols-4">
        <Stat
          label="Active"
          value={String(data.active)}
          note={
            data.active === 0
              ? "nothing running"
              : data.dueNow > 0
                ? `${data.dueNow} due now`
                : "all logged"
          }
        />
        <Stat
          label="Win rate"
          value={winRate === null ? "–" : `${winRate}%`}
          note={
            data.won + data.lost === 0
              ? "none finished yet"
              : `${data.won} won · ${data.lost} ended short`
          }
          className="border-border border-l"
        />
        <Stat
          label="Consistency"
          value={consistency === null ? "–" : `${consistency}%`}
          note={
            data.closed > 0
              ? `${data.kept} of ${data.closed} slots kept`
              : "starts once a slot has closed"
          }
          className="border-border border-t lg:border-t-0 lg:border-l"
        />
        <Stat
          label="Best streak"
          value={String(data.bestStreak)}
          note={`current ${data.currentStreak}`}
          tone={data.currentStreak > 0 ? "kept" : undefined}
          className="border-border border-t border-l lg:border-t-0"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Activity
          days={data.activity}
          recent={recent}
          total={data.totalCheckIns}
          last={data.lastCheckIn}
        />
        <ByCategory stats={data.categories} />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  note,
  tone,
  className,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "kept";
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2 px-5 py-5 sm:px-6", className)}>
      <span className="text-muted-foreground text-[13px]">{label}</span>
      <span
        className={cn(
          "text-4xl leading-none tracking-[-0.04em] tabular-nums sm:text-5xl",
          tone === "kept" && "text-success-ink",
        )}
      >
        {value}
      </span>
      <span className="text-muted-foreground text-[13px] text-pretty">{note}</span>
    </div>
  );
}

/** Check-ins per day, with the one fact that matters when the bars are flat. */
function Activity({
  days,
  recent,
  total,
  last,
}: {
  days: { date: string; count: number }[];
  recent: number;
  total: number;
  last: string | null;
}) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="bg-muted/60 flex min-w-0 flex-col gap-4 rounded-3xl p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg tracking-[-0.02em]">Last {days.length} days</h2>
        <span className="text-muted-foreground text-[13px] tabular-nums">
          {total} check-ins all time
        </span>
      </div>
      <div className="flex h-20 items-end gap-[3px]" aria-hidden>
        {days.map((d) => (
          <span
            key={d.date}
            title={`${formatDay(d.date)} · ${d.count} check-in${d.count === 1 ? "" : "s"}`}
            className={cn(
              "flex-1 rounded-t-[3px]",
              d.count === 0 ? "bg-border h-[3px]" : "bg-success",
            )}
            style={d.count ? { height: `${(d.count / max) * 100}%` } : undefined}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-sm text-pretty">
        {recent > 0 ? (
          <>
            <span className="text-foreground tabular-nums">{recent}</span>{" "}
            check-in{recent === 1 ? "" : "s"} in this window
            {last ? `, the latest on ${formatDay(last)}.` : "."}
          </>
        ) : last ? (
          <>
            Nothing logged in {days.length} days. Your last check-in was{" "}
            <span className="text-foreground">{formatDay(last)}</span>.
          </>
        ) : (
          "Your check-ins will show up here."
        )}
      </p>
    </div>
  );
}

/**
 * Challenges by category: how many, how they ended, and how reliably you show
 * up for each kind. The sentence on top is the takeaway, so nobody has to
 * read the bars to get it.
 */
function ByCategory({ stats }: { stats: CategoryStat[] }) {
  const scored = stats
    .filter((s) => s.closed > 0)
    .map((s) => ({ ...s, rate: s.kept / s.closed }));
  const best = scored.reduce<(typeof scored)[number] | null>(
    (a, s) => (!a || s.rate > a.rate ? s : a),
    null,
  );
  const worst = scored.reduce<(typeof scored)[number] | null>(
    (a, s) => (!a || s.rate < a.rate ? s : a),
    null,
  );
  const maxTotal = Math.max(1, ...stats.map((s) => s.total));

  return (
    <div className="bg-muted/60 flex min-w-0 flex-col gap-4 rounded-3xl p-5 sm:p-6">
      <h2 className="text-lg tracking-[-0.02em]">By category</h2>

      {best && worst && best.category.id !== worst.category.id && (
        <p className="text-sm text-pretty">
          You show up most for{" "}
          <span className="font-medium">{best.category.label.toLowerCase()}</span>{" "}
          <span className="text-muted-foreground tabular-nums">
            ({Math.round(best.rate * 100)}% of slots)
          </span>
          , least for{" "}
          <span className="font-medium">{worst.category.label.toLowerCase()}</span>{" "}
          <span className="text-muted-foreground tabular-nums">
            ({Math.round(worst.rate * 100)}%)
          </span>
          .
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {stats.map((s) => {
          const rate = pct(s.kept, s.closed);
          return (
            <li
              key={s.category.id}
              className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3rem] items-center gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("size-2 shrink-0 rounded-full", s.category.dot)} aria-hidden />
                <span className="truncate">{s.category.label}</span>
              </span>
              {/* Bar length is the category's share of your challenges;
                  segments say how they went. */}
              <span
                className="flex h-2.5 overflow-hidden rounded-full"
                style={{ width: `${Math.max(8, (s.total / maxTotal) * 100)}%` }}
                role="img"
                aria-label={`${s.total} challenges: ${s.won} won, ${s.active + s.upcoming} running, ${s.lost} ended short`}
              >
                <span className="bg-success" style={{ flex: s.won }} />
                <span className="bg-primary" style={{ flex: s.active + s.upcoming }} />
                <span className="bg-muted-foreground/25" style={{ flex: s.lost }} />
              </span>
              <span className="text-muted-foreground text-right text-[13px] tabular-nums">
                {rate === null ? "–" : `${rate}%`}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <Key className="bg-success">Won</Key>
        <Key className="bg-primary">Running</Key>
        <Key className="bg-muted-foreground/25">Ended short</Key>
        <span>% = slots kept</span>
      </p>
    </div>
  );
}

function Key({ className, children }: { className: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-full", className)} aria-hidden />
      {children}
    </span>
  );
}
