import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Columns3,
  Heart,
  LayoutGrid,
  List,
  Trophy,
} from "lucide-react";
import {
  cadenceLabel,
  formatCount,
  formatDay,
  periodNoun,
  type ChallengeEval,
  type Period,
} from "@/lib/challenges";
import type { Category } from "@/lib/categories";
import { MiniChain } from "@/components/chain-grid";
import { QuickLog } from "@/components/quick-log";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type DashboardView = "list" | "grid" | "board";
export type DashboardGroup = "category" | "status";

export type ChallengeRow = {
  id: string;
  title: string;
  cadence: string;
  cadence_weekday: number | null;
  daily_target: number;
  total_target: number | null;
  target_unit: string | null;
  start_date: string;
  end_date: string | null;
  stake_text: string | null;
};

export type OwnedCard = {
  c: ChallengeRow;
  ev: ChallengeEval;
  dates: string[];
  periods: Period[];
  category: Category;
  hasBuddy: boolean;
  cheers: number;
};

export type Group = {
  key: string;
  title: string;
  /** Category dot, when grouped by category. */
  dot?: string;
  items: OwnedCard[];
};

/* -------------------------------------------------------------------------- */
/*  View switcher                                                              */
/* -------------------------------------------------------------------------- */

const VIEWS: { id: DashboardView; label: string; icon: typeof List }[] = [
  { id: "list", label: "List", icon: List },
  { id: "grid", label: "Grid", icon: LayoutGrid },
  { id: "board", label: "Board", icon: Columns3 },
];

const GROUPS: { id: DashboardGroup; label: string }[] = [
  { id: "category", label: "Category" },
  { id: "status", label: "Status" },
];

/**
 * View and grouping live in the URL (`?view=grid&group=status`), so they
 * survive a reload, work without JavaScript and can be bookmarked. Plain links,
 * not a client toggle: the page is server-rendered anyway.
 */
export function ViewSwitch({
  view,
  group,
}: {
  view: DashboardView;
  group: DashboardGroup;
}) {
  const href = (v: DashboardView, g: DashboardGroup) =>
    `/dashboard?view=${v}&group=${g}`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <nav aria-label="Layout" className="bg-muted flex gap-1 rounded-full p-1">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={href(id, group)}
            aria-current={view === id ? "page" : undefined}
            scroll={false}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
              view === id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      {/* The board is always one column per category; grouping only applies
          to the list and the grid. */}
      {view !== "board" && (
        <nav
          aria-label="Group by"
          className="text-muted-foreground flex items-center gap-1 text-sm"
        >
          <span className="mr-1">Group by</span>
          {GROUPS.map(({ id, label }) => (
            <Link
              key={id}
              href={href(view, id)}
              aria-current={group === id ? "page" : undefined}
              scroll={false}
              className={cn(
                "rounded-full px-3 py-1.5 transition-colors",
                group === id
                  ? "text-foreground bg-muted"
                  : "hover:text-foreground",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Layouts                                                                    */
/* -------------------------------------------------------------------------- */

function GroupHeading({ group }: { group: Group }) {
  return (
    <h2 className="flex items-center gap-2.5 text-xl tracking-[-0.025em]">
      {group.dot && (
        <span className={cn("size-2.5 shrink-0 rounded-full", group.dot)} aria-hidden />
      )}
      {group.title}
      <span className="text-muted-foreground text-sm tabular-nums">
        {group.items.length}
      </span>
    </h2>
  );
}

export function ChallengeList({ groups, today }: { groups: Group[]; today: string }) {
  return (
    <>
      {groups.map((g) => (
        <section key={g.key} className="mt-10">
          <GroupHeading group={g} />
          <ul className="border-border bg-card divide-border mt-3 divide-y rounded-3xl border">
            {g.items.map((o) => (
              <ChallengeRowItem key={o.c.id} card={o} today={today} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

export function ChallengeGrid({ groups, today }: { groups: Group[]; today: string }) {
  return (
    <>
      {groups.map((g) => (
        <section key={g.key} className="mt-10">
          <GroupHeading group={g} />
          <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((o) => (
              <li key={o.c.id} className="flex">
                <ChallengeCard card={o} today={today} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

/**
 * One column per category, side by side. Scrolls sideways when there are
 * more columns than fit (with snap points, so a phone lands on a column
 * rather than between two).
 */
export function ChallengeBoard({ groups, today }: { groups: Group[]; today: string }) {
  return (
    <div className="-mx-5 mt-10 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8">
      <div className="flex snap-x snap-mandatory gap-4">
        {groups.map((g) => (
          <section
            key={g.key}
            className="bg-muted/60 flex w-[19rem] shrink-0 snap-start flex-col gap-3 rounded-3xl p-3"
          >
            <div className="px-2 pt-2">
              <GroupHeading group={g} />
            </div>
            <ul className="flex flex-col gap-3">
              {g.items.map((o) => (
                <li key={o.c.id} className="flex">
                  <ChallengeCard card={o} today={today} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  One challenge                                                              */
/* -------------------------------------------------------------------------- */

const isClosed = (ev: ChallengeEval) => ev.status === "won" || ev.status === "failed";

function metaLine(c: ChallengeRow, ev: ChallengeEval): string {
  const when =
    ev.status === "failed"
      ? "ended short"
      : ev.status === "won"
        ? "completed"
        : ev.status === "upcoming"
          ? `starts ${formatDay(c.start_date)}`
          : ev.daysRemaining !== null
            ? `${ev.daysRemaining} day${ev.daysRemaining === 1 ? "" : "s"} left`
            : null;
  const progress =
    ev.mode === "total"
      ? `${formatCount(ev.totalLogged, c.target_unit)} of ${formatCount(ev.totalTarget ?? 0)}`
      : ev.totalPeriods !== null
        ? `${ev.donePeriods} of ${ev.totalPeriods}`
        : null;
  return [cadenceLabel(c.cadence, c.cadence_weekday), when, progress]
    .filter(Boolean)
    .join(" · ");
}

/**
 * List row. The title carries a stretched link over the whole row, so the row
 * is one big target while the check-in button stays a separate control on top
 * (a button inside an anchor is neither valid nor operable).
 */
const ROW =
  "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-3 px-5 py-4 [grid-template-areas:'title_action''chain_streak'] sm:px-6 md:grid-cols-[minmax(0,1fr)_13rem_5rem_auto] md:[grid-template-areas:'title_chain_streak_action'] hover:bg-muted/40 transition-colors first:rounded-t-3xl last:rounded-b-3xl";

function ChallengeRowItem({ card, today }: { card: OwnedCard; today: string }) {
  const { c, ev, dates, periods } = card;
  const closed = isClosed(ev);
  return (
    <li className={cn(ROW, closed && "text-muted-foreground")}>
      <div className="min-w-0 [grid-area:title]">
        <TitleLink card={card} />
        <Meta card={card} />
        <StakeAndBuddy card={card} />
      </div>
      <MiniChain
        periods={periods}
        done={new Set(dates)}
        today={today}
        className={cn("[grid-area:chain]", closed && "opacity-60")}
      />
      <StreakFigure streak={ev.streak} cadence={c.cadence} className="[grid-area:streak] text-right" />
      <div className="relative z-10 self-start justify-self-end [grid-area:action] md:self-center">
        <Action card={card} today={today} />
      </div>
    </li>
  );
}

/** Grid and board card: the same facts as a row, stacked. */
function ChallengeCard({ card, today }: { card: OwnedCard; today: string }) {
  const { c, ev, dates, periods } = card;
  const closed = isClosed(ev);
  return (
    <article
      className={cn(
        "border-border bg-card hover:bg-muted/40 relative flex w-full flex-col gap-4 rounded-3xl border p-5 transition-colors",
        closed && "text-muted-foreground",
      )}
    >
      <div className="min-w-0">
        <TitleLink card={card} />
        <Meta card={card} />
      </div>
      <MiniChain
        periods={periods}
        done={new Set(dates)}
        today={today}
        className={cn(closed && "opacity-60")}
      />
      <StakeAndBuddy card={card} />
      <div className="mt-auto flex items-end justify-between gap-3">
        <StreakFigure streak={ev.streak} cadence={c.cadence} />
        <div className="relative z-10">
          <Action card={card} today={today} />
        </div>
      </div>
    </article>
  );
}

function TitleLink({ card }: { card: OwnedCard }) {
  const closed = isClosed(card.ev);
  return (
    <Link
      href={`/challenges/${card.c.id}`}
      className={cn(
        "rounded-sm text-[17px] leading-snug tracking-[-0.015em] break-words after:absolute after:inset-0 hover:underline",
        !closed && "text-foreground",
      )}
    >
      {card.c.title}
    </Link>
  );
}

function Meta({ card }: { card: OwnedCard }) {
  const { c, ev } = card;
  const atRisk = ev.status === "active" && ev.skipsLeft === 0;
  return (
    <p className="text-muted-foreground mt-0.5 text-[13px] text-pretty">
      {metaLine(c, ev)}
      {atRisk && <span className="text-warning-ink font-medium"> · no skips left</span>}
      {!atRisk && ev.skipsLeft !== null && ev.status === "active" && (
        <span>
          {" "}
          · {ev.skipsLeft} skip{ev.skipsLeft === 1 ? "" : "s"} left
        </span>
      )}
    </p>
  );
}

/**
 * The stake and who's watching: the two things that supply the pressure. The
 * owner sees whether a buddy claimed the invite and how many reactions came
 * in, never the buddy's name (`users` is self-read only).
 */
function StakeAndBuddy({ card }: { card: OwnedCard }) {
  const { c, hasBuddy, cheers } = card;
  const closed = isClosed(card.ev);
  return (
    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px]">
      {c.stake_text && (
        <span className="line-clamp-1 min-w-0 break-all">
          <span className={closed ? "" : "text-cheer-ink font-medium"}>Stake:</span>{" "}
          {c.stake_text}
        </span>
      )}
      <span className="text-muted-foreground inline-flex items-center gap-1.5">
        {hasBuddy ? (
          "Buddy watching"
        ) : (
          <span className={cn("font-medium", !closed && "text-primary")}>
            No buddy yet
          </span>
        )}
        {cheers > 0 && (
          <span className="inline-flex items-center gap-1">
            · <Heart className="size-3" aria-hidden />
            <span className="tabular-nums">{cheers}</span>
            <span className="sr-only">
              reaction{cheers === 1 ? "" : "s"} from your buddy
            </span>
          </span>
        )}
      </span>
    </p>
  );
}

function StreakFigure({
  streak,
  cadence,
  className,
}: {
  streak: number;
  cadence: string;
  className?: string;
}) {
  // "14 day streak", like "a 14-day run": the unit stays singular.
  const { one } = periodNoun(cadence);
  return (
    <p className={cn("leading-none", className)}>
      <span className="text-2xl tracking-[-0.04em] tabular-nums">{streak}</span>
      <span className="text-muted-foreground mt-1 block text-[11px]">{one} streak</span>
    </p>
  );
}

/** The one thing to do with this challenge right now, or its outcome. */
function Action({ card, today }: { card: OwnedCard; today: string }) {
  const { c, ev, dates } = card;
  // A cumulative goal needs a number before it can be logged, so those still
  // go through the detail page; everything else can be a single tap.
  const quickValue = ev.mode === "total" ? null : Math.max(1, c.daily_target);

  if (ev.status === "won") {
    return (
      <span className="text-success-ink inline-flex items-center gap-1 text-sm font-medium">
        <Trophy className="size-4" aria-hidden />
        Won
      </span>
    );
  }
  if (ev.status === "failed") return <span className="text-sm">Ended</span>;
  if (ev.status === "upcoming") {
    return <span className="text-muted-foreground text-sm">Not started</span>;
  }
  if (!ev.dueNow) {
    return (
      <span className="text-success-ink inline-flex items-center gap-1 text-sm font-medium">
        <CheckCircle2 className="size-4" aria-hidden />
        {dates.includes(today) ? "Logged" : "Covered"}
      </span>
    );
  }
  if (quickValue !== null) {
    return (
      <QuickLog
        challengeId={c.id}
        value={quickValue}
        streak={ev.streak}
        // No unit: the title already says what's being counted, and a long
        // label crowds a phone-width row.
        label={ev.mode === "each" ? `Log ${c.daily_target.toLocaleString("en-US")}` : "Log today"}
      />
    );
  }
  return (
    <Button size="sm" variant="outline" asChild>
      <Link href={`/challenges/${c.id}`}>
        Log
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </Button>
  );
}
