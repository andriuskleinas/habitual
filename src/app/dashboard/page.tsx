import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Heart, Plus, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  cadenceLabel,
  evaluateChallenge,
  formatCount,
  formatDay,
  periodNoun,
  schedulePeriods,
  todayISO,
  type ChallengeEval,
} from "@/lib/challenges";
import { displayName } from "@/lib/profile";
import { AppHeader } from "@/components/app-header";
import { QuickLog } from "@/components/quick-log";
import { MiniChain } from "@/components/chain-grid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

/** How far back the activity strip looks. Two weeks reads as "lately". */
const ACTIVITY_DAYS = 14;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this route; this is a defensive fallback.
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, surname, nickname, email, password_set_at")
    .eq("id", user.id)
    .single();

  // Buddies and reactions ride along as embedded rows rather than two more
  // round-trips: the cards need "is anyone actually watching this?" and "have
  // they cheered?", which is the whole reason a stake works.
  const { data: challenges } = await supabase
    .from("challenges")
    .select(
      "id, title, cadence, cadence_weekday, daily_target, total_target, target_unit, start_date, end_date, allowance_mode, allowance_value, max_misses_in_row, stake_text, check_ins(date, value), buddies(status), reactions(id)",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  // "I'm a buddy on": challenges this user was invited to and claimed. RLS lets
  // a claimed buddy read the challenge + its check-ins; the owner's name isn't
  // buddy-readable, so these cards link to the token (buddy) view instead.
  const { data: buddyRows } = await supabase
    .from("buddies")
    .select(
      "invite_token, challenge:challenges(id, title, cadence, cadence_weekday, daily_target, total_target, start_date, end_date, allowance_mode, allowance_value, max_misses_in_row, check_ins(date, value))",
    )
    .eq("buddy_user_id", user.id)
    .eq("status", "claimed")
    .order("created_at", { ascending: false });

  const names = {
    name: profile?.name ?? null,
    surname: profile?.surname ?? null,
    nickname: profile?.nickname ?? null,
    email: user.email ?? profile?.email ?? null,
  };
  const today = todayISO();
  const list = challenges ?? [];
  const buddyList = (buddyRows ?? []).flatMap((b) => {
    const c = Array.isArray(b.challenge) ? b.challenge[0] : b.challenge;
    return c ? [{ token: b.invite_token, challenge: c }] : [];
  });

  // Score every owned challenge against its own cadence and skip rules once,
  // then reuse it for both the roll-up stats and the cards below.
  const owned: OwnedCard[] = list.map((c) => {
    const checkIns = c.check_ins ?? [];
    return {
      c,
      dates: checkIns.map((ci) => ci.date),
      hasBuddy: (c.buddies ?? []).some((b) => b.status === "claimed"),
      cheers: (c.reactions ?? []).length,
      ev: evaluateChallenge(
        {
          cadence: c.cadence,
          cadenceWeekday: c.cadence_weekday,
          startDate: c.start_date,
          endDate: c.end_date,
          allowanceMode: c.allowance_mode,
          allowanceValue: c.allowance_value,
          maxMissesInRow: c.max_misses_in_row,
          dailyTarget: c.daily_target,
          totalTarget: c.total_target,
        },
        checkIns,
        today,
      ),
    };
  });

  /* --------------------------- Sorting into piles --------------------------- */

  // The dashboard's one job is "what needs me right now", so the list stops
  // being a flat wall in creation order and becomes three piles. Within the
  // urgent pile: no wiggle room left first, then whatever runs out soonest.
  const needsYou = owned
    .filter((o) => o.ev.status === "active" && o.ev.dueNow)
    .sort(
      (a, b) =>
        (a.ev.skipsLeft === 0 ? 0 : 1) - (b.ev.skipsLeft === 0 ? 0 : 1) ||
        (a.ev.daysRemaining ?? 9999) - (b.ev.daysRemaining ?? 9999) ||
        b.ev.streak - a.ev.streak,
    );
  const onTrack = owned.filter(
    (o) =>
      (o.ev.status === "active" && !o.ev.dueNow) || o.ev.status === "upcoming",
  );
  const finished = owned.filter(
    (o) => o.ev.status === "won" || o.ev.status === "failed",
  );

  /* ------------------------------- Roll-ups -------------------------------- */

  // "Now", not "today": a once-a-week challenge isn't behind on a Tuesday, and
  // counting it as an unlogged day was quietly making everyone look worse than
  // they are.
  const liveNow = owned.filter((o) => o.ev.status === "active" && o.ev.coversToday);
  const dueCount = needsYou.length;
  const doneNow = liveNow.length - dueCount;

  const currentStreak = Math.max(0, ...owned.map((o) => o.ev.streak));
  const bestStreak = Math.max(0, ...owned.map((o) => o.ev.bestStreak));
  const totalCheckIns = owned.reduce((n, o) => n + o.dates.length, 0);

  // Consistency over every slot that has actually elapsed — the one number here
  // that can go down, and the only one that says whether this is working.
  const closedPeriods = owned.reduce((n, o) => n + o.ev.closedPeriods, 0);
  const keptPeriods =
    closedPeriods - owned.reduce((n, o) => n + o.ev.missedPeriods, 0);
  const consistency =
    closedPeriods > 0 ? Math.round((keptPeriods / closedPeriods) * 100) : null;

  const perDay = new Map<string, number>();
  for (const o of owned) {
    for (const d of o.dates) perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }
  const activity = Array.from({ length: ACTIVITY_DAYS }, (_, i) => {
    const date = addDays(today, i - (ACTIVITY_DAYS - 1));
    return { date, count: perDay.get(date) ?? 0 };
  });

  const dueWithStake = needsYou.filter((o) => o.c.stake_text).length;

  const status =
    list.length === 0
      ? "Your challenges will live here."
      : dueCount === 0
        ? liveNow.length === 0
          ? "Nothing is due right now. Your next slot will show up here."
          : "Nothing owing right now. Come back tomorrow."
        : dueWithStake > 0
          ? `${dueCount} to log, ${dueWithStake} with something on the line.`
          : `${dueCount} challenge${dueCount === 1 ? "" : "s"} waiting on you.`;

  return (
    <>
      <AppHeader profile={names} />

      <main
        id="main"
        className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14"
      >
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-muted-foreground text-sm">{longDate(today)}</p>
            <h1 className="text-[clamp(2.25rem,5vw,3.25rem)] leading-none tracking-[-0.045em] text-balance">
              Hi, {displayName(names)}
            </h1>
            <p className="text-muted-foreground text-pretty">{status}</p>
          </div>
          {/* Starting a challenge belongs here, where it's the actual job. */}
          {list.length > 0 && (
            <Button size="lg" className="sm:shrink-0" asChild>
              <Link href="/challenges/new">
                <Plus className="size-4" aria-hidden />
                New challenge
              </Link>
            </Button>
          )}
        </section>

        {/* Magic-link-only accounts: one quiet nudge toward a password, which
            is what makes signing in on a new device instant. */}
        {!profile?.password_set_at && (
          <section className="bg-muted/60 mt-8 flex flex-col gap-3 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-pretty">
              <span className="font-medium">Add a password.</span>{" "}
              <span className="text-muted-foreground">
                Sign in instantly instead of waiting for an emailed link.
              </span>
            </p>
            <Button size="sm" variant="outline" className="sm:shrink-0" asChild>
              <Link href="/account/password?next=/dashboard">Set password</Link>
            </Button>
          </section>
        )}

        {list.length > 0 && (
          <section
            aria-label="Where you stand"
            className="bg-muted/60 mt-8 grid grid-cols-2 rounded-3xl lg:grid-cols-[1fr_1fr_1fr_1.4fr]"
          >
            <Stat
              label="Due now"
              value={liveNow.length === 0 ? "0" : `${doneNow}`}
              unit={liveNow.length === 0 ? "nothing open" : `of ${liveNow.length} done`}
            />
            <Stat
              label="Current streak"
              value={String(currentStreak)}
              unit={bestStreak > currentStreak ? `best ${bestStreak}` : "your best yet"}
              tone="kept"
              className="border-border border-l"
            />
            <Stat
              label="Consistency"
              value={consistency === null ? "–" : `${consistency}%`}
              unit={
                closedPeriods > 0
                  ? `${keptPeriods} of ${closedPeriods} kept`
                  : "starts once a slot has closed"
              }
              className="border-border border-t lg:border-t-0 lg:border-l"
            />
            <Activity
              total={totalCheckIns}
              days={activity}
              className="border-border border-t border-l lg:border-t-0"
            />
          </section>
        )}

        {list.length === 0 ? (
          <section className="bg-muted/60 mt-10 flex flex-col items-start gap-4 rounded-3xl px-6 py-12 sm:px-10 sm:py-16">
            <h2 className="max-w-[16ch] text-[clamp(1.875rem,4vw,2.75rem)] leading-none tracking-[-0.04em] text-balance">
              Start your first challenge
            </h2>
            <p className="text-muted-foreground max-w-md text-pretty">
              Pick a habit, name what you lose if you skip, and send one link
              to a friend. It takes about a minute.
            </p>
            <Button size="xl" className="mt-2" asChild>
              <Link href="/challenges/new">
                <Plus className="size-5" aria-hidden />
                Start a challenge
              </Link>
            </Button>
          </section>
        ) : (
          <>
            {needsYou.length > 0 && (
              <ChallengeSection
                title="Needs you now"
                items={needsYou}
                today={today}
                tone="due"
              />
            )}
            {onTrack.length > 0 && (
              <ChallengeSection
                title="All set"
                items={onTrack}
                today={today}
                tone="calm"
              />
            )}
            {finished.length > 0 && (
              <ChallengeSection
                title="Finished"
                items={finished}
                today={today}
                tone="closed"
              />
            )}
          </>
        )}

        {buddyList.length > 0 && (
          <section className="mt-12">
            <SectionHeading title="I'm a buddy on" count={buddyList.length} />
            <ul className="border-border bg-card divide-border mt-3 divide-y rounded-3xl border">
              {buddyList.map(({ token, challenge: c }) => {
                const checkIns: { date: string; value: number }[] =
                  c.check_ins ?? [];
                const rules = {
                  cadence: c.cadence,
                  cadenceWeekday: c.cadence_weekday,
                  startDate: c.start_date,
                  endDate: c.end_date,
                  allowanceMode: c.allowance_mode,
                  allowanceValue: c.allowance_value,
                  maxMissesInRow: c.max_misses_in_row,
                  dailyTarget: c.daily_target,
                  totalTarget: c.total_target,
                };
                const ev = evaluateChallenge(rules, checkIns, today);
                const periods = schedulePeriods({ ...rules, today });

                return (
                  <li key={c.id} className={ROW}>
                    <div className="min-w-0 [grid-area:title]">
                      <Link
                        href={`/i/${token}`}
                        className="rounded-sm text-[17px] leading-snug tracking-[-0.015em] break-words after:absolute after:inset-0 hover:underline"
                      >
                        {c.title}
                      </Link>
                      <p className="text-muted-foreground mt-0.5 text-[13px]">
                        {cadenceLabel(c.cadence, c.cadence_weekday)} ·{" "}
                        {ev.dueNow ? "hasn't checked in yet" : "covered"}
                      </p>
                    </div>
                    <MiniChain
                      periods={periods}
                      done={new Set(checkIns.map((ci) => ci.date))}
                      today={today}
                      className="[grid-area:chain]"
                    />
                    <StreakFigure streak={ev.streak} cadence={c.cadence} />
                    {/* Being a buddy is a job, not a spectator seat: say what
                        the job is. */}
                    <span className="text-cheer-ink self-center justify-self-end text-sm font-medium [grid-area:action]">
                      {ev.dueNow ? "Nudge them" : "Send a cheer"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pieces                                                                     */
/* -------------------------------------------------------------------------- */

type ChallengeRow = {
  id: string;
  title: string;
  cadence: string;
  cadence_weekday: number | null;
  daily_target: number;
  total_target: number | null;
  target_unit: string | null;
  start_date: string;
  end_date: string | null;
  allowance_mode: string | null;
  allowance_value: number | null;
  max_misses_in_row: number | null;
  stake_text: string | null;
};

type OwnedCard = {
  c: ChallengeRow;
  ev: ChallengeEval;
  dates: string[];
  hasBuddy: boolean;
  cheers: number;
};

/** "Monday 9 November", on the same UTC calendar the rest of the app uses. */
function longDate(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/**
 * One cell of the summary strip. Numbers are large and light, like the rest of
 * the type; only the streak is green, because it's the only kept-commitment
 * number here.
 */
function Stat({
  label,
  value,
  unit,
  tone,
  className,
}: {
  label: string;
  value: string;
  unit: string;
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
      <span className="text-muted-foreground text-[13px] text-pretty">{unit}</span>
    </div>
  );
}

/** Check-ins per day for the last fortnight, as bars: momentum at a glance. */
function Activity({
  total,
  days,
  className,
}: {
  total: number;
  days: { date: string; count: number }[];
  className?: string;
}) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className={cn("flex min-w-0 flex-col gap-2 px-5 py-5 sm:px-6", className)}>
      <span className="text-muted-foreground text-[13px]">
        Check-ins, last {days.length} days
      </span>
      <div className="flex h-12 items-end gap-[3px]" aria-hidden>
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
      <span className="text-muted-foreground text-[13px]">
        <span className="text-foreground tabular-nums">{total}</span> all time
      </span>
    </div>
  );
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="flex items-baseline gap-2.5 text-xl tracking-[-0.025em]">
      {title}
      <span className="text-muted-foreground text-sm tabular-nums">{count}</span>
    </h2>
  );
}

/**
 * Row layout shared by owned and buddy challenges. Phone: title and action on
 * top, chain and streak underneath. Desktop: one line, chain in its own column
 * so the chains line up down the list.
 */
const ROW =
  "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-3 px-5 py-4 [grid-template-areas:'title_action''chain_streak'] sm:px-6 md:grid-cols-[minmax(0,1fr)_13rem_5rem_auto] md:[grid-template-areas:'title_chain_streak_action'] hover:bg-muted/40 transition-colors first:rounded-t-3xl last:rounded-b-3xl";

function StreakFigure({ streak, cadence }: { streak: number; cadence: string }) {
  // "14 day streak", like "a 14-day run": the unit stays singular.
  const { one } = periodNoun(cadence);
  return (
    <p className="text-right leading-none [grid-area:streak]">
      <span className="text-2xl tracking-[-0.04em] tabular-nums">{streak}</span>
      <span className="text-muted-foreground mt-1 block text-[11px]">
        {one} streak
      </span>
    </p>
  );
}

function ChallengeSection({
  title,
  items,
  today,
  tone,
}: {
  title: string;
  items: OwnedCard[];
  today: string;
  tone: "due" | "calm" | "closed";
}) {
  return (
    <section className="mt-12">
      <SectionHeading title={title} count={items.length} />
      <ul className="border-border bg-card divide-border mt-3 divide-y rounded-3xl border">
        {items.map((o) => (
          <ChallengeRowItem key={o.c.id} card={o} today={today} tone={tone} />
        ))}
      </ul>
    </section>
  );
}

/**
 * One owned challenge.
 *
 * The row answers the questions that decide whether someone acts: how is the
 * run going (the chain and the streak), what happens if I don't (the stake),
 * and who's watching. The title carries a stretched link over the whole row,
 * so the row is one big target while the check-in button stays a separate
 * control on top of it (a button inside an anchor is neither valid nor
 * operable).
 */
function ChallengeRowItem({
  card,
  today,
  tone,
}: {
  card: OwnedCard;
  today: string;
  tone: "due" | "calm" | "closed";
}) {
  const { c, ev, dates, hasBuddy, cheers } = card;
  const atRisk = ev.status === "active" && ev.skipsLeft === 0;
  const loggedToday = dates.includes(today);
  // A cumulative goal needs a number before it can be logged, so those still
  // go through the detail page; everything else can be a single tap.
  const quickValue = ev.mode === "total" ? null : Math.max(1, c.daily_target);
  const periods = schedulePeriods({
    cadence: c.cadence,
    cadenceWeekday: c.cadence_weekday,
    startDate: c.start_date,
    endDate: c.end_date,
    today,
  });

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

  return (
    <li className={cn(ROW, tone === "closed" && "text-muted-foreground")}>
      <div className="min-w-0 [grid-area:title]">
        <Link
          href={`/challenges/${c.id}`}
          className={cn(
            "rounded-sm text-[17px] leading-snug tracking-[-0.015em] break-words after:absolute after:inset-0 hover:underline",
            tone !== "closed" && "text-foreground",
          )}
        >
          {c.title}
        </Link>
        <p className="text-muted-foreground mt-0.5 text-[13px] text-pretty">
          {[cadenceLabel(c.cadence, c.cadence_weekday), when, progress]
            .filter(Boolean)
            .join(" · ")}
          {atRisk && (
            <span className="text-warning-ink font-medium"> · no skips left</span>
          )}
          {!atRisk && ev.skipsLeft !== null && ev.status === "active" && (
            <span>
              {" "}
              · {ev.skipsLeft} skip{ev.skipsLeft === 1 ? "" : "s"} left
            </span>
          )}
        </p>
        {/* What's on the line, and who's watching: the two things that supply
            the pressure, so they sit on the row, not a click away. */}
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px]">
          {c.stake_text && (
            <span className="min-w-0 line-clamp-1 break-all">
              <span
                className={tone === "closed" ? "" : "text-cheer-ink font-medium"}
              >
                Stake:
              </span>{" "}
              {c.stake_text}
            </span>
          )}
          <BuddyLine hasBuddy={hasBuddy} cheers={cheers} quiet={tone === "closed"} />
        </p>
      </div>

      <MiniChain
        periods={periods}
        done={new Set(dates)}
        today={today}
        className={cn("[grid-area:chain]", tone === "closed" && "opacity-60")}
      />

      <StreakFigure streak={ev.streak} cadence={c.cadence} />

      <div className="relative z-10 self-start justify-self-end [grid-area:action] md:self-center">
        {ev.status === "won" ? (
          <span className="text-success-ink inline-flex items-center gap-1 text-sm font-medium">
            <Trophy className="size-4" aria-hidden />
            Won
          </span>
        ) : ev.status === "failed" ? (
          <span className="text-sm">Ended</span>
        ) : ev.status === "upcoming" ? (
          <span className="text-muted-foreground text-sm">Not started</span>
        ) : !ev.dueNow ? (
          <span className="text-success-ink inline-flex items-center gap-1 text-sm font-medium">
            <CheckCircle2 className="size-4" aria-hidden />
            {loggedToday ? "Logged" : "Covered"}
          </span>
        ) : quickValue !== null ? (
          <QuickLog
            challengeId={c.id}
            value={quickValue}
            streak={ev.streak}
            // Deliberately no unit: the title already says what's being
            // counted, and a long label crowds a phone-width row.
            label={
              ev.mode === "each"
                ? `Log ${c.daily_target.toLocaleString("en-US")}`
                : "Log today"
            }
          />
        ) : (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/challenges/${c.id}`}>
              Log
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </li>
  );
}

/**
 * Accountability, stated. The owner can see whether a buddy has claimed the
 * invite and how many reactions came in, never the buddy's name: `users` is
 * self-read only. "Invite a buddy" is a live prompt rather than a grey fact,
 * because an unwitnessed challenge is the one most likely to be dropped.
 */
function BuddyLine({
  hasBuddy,
  cheers,
  quiet,
}: {
  hasBuddy: boolean;
  cheers: number;
  quiet: boolean;
}) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5">
      {hasBuddy ? (
        "Buddy watching"
      ) : (
        <span className={cn("font-medium", !quiet && "text-primary")}>
          No buddy yet
        </span>
      )}
      {cheers > 0 && (
        <span className="inline-flex items-center gap-1">
          · <Heart className="size-3" aria-hidden />
          <span className="tabular-nums">{cheers}</span>
          <span className="sr-only">
            {/* The heart stands for any reaction type (cheer, nudge, note). */}
            reaction{cheers === 1 ? "" : "s"} from your buddy
          </span>
        </span>
      )}
    </span>
  );
}
