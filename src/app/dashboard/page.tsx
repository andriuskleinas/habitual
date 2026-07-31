import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Flame,
  HandCoins,
  Heart,
  KeyRound,
  PartyPopper,
  Plus,
  Target,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  cadenceLabel,
  evaluateChallenge,
  formatCount,
  formatDay,
  todayISO,
  type ChallengeEval,
} from "@/lib/challenges";
import { displayName } from "@/lib/profile";
import { AppHeader } from "@/components/app-header";
import { QuickLog } from "@/components/quick-log";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  const nextUp = needsYou[0] ?? null;
  const dueWithStake = needsYou.filter((o) => o.c.stake_text).length;

  return (
    <>
      <AppHeader profile={names} />

      <main
        id="main"
        className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-12"
      >
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hey {displayName(names)} 👋
            </h1>
            <p className="text-muted-foreground text-pretty">
              {list.length === 0
                ? "Your challenges will live here."
                : dueCount === 0
                  ? "Nothing owing right now. Nice work."
                  : `${dueCount} challenge${dueCount === 1 ? "" : "s"} waiting on you.`}
            </p>
          </div>
          {/* Starting a challenge used to hide in the header on every page; it
              belongs here, where it's the actual job. */}
          {list.length > 0 && (
            <Button size="lg" className="sm:shrink-0" asChild>
              <Link href="/challenges/new">
                <Plus className="size-4" aria-hidden />
                New challenge
              </Link>
            </Button>
          )}
        </section>

        {/* Magic-link-only accounts: one dismissible-feeling nudge toward a
            password, which is what makes signing in on a new device instant. */}
        {!profile?.password_set_at && (
          <section className="mt-6">
            <div className="ring-primary/20 bg-primary/[0.04] flex flex-col gap-3 rounded-xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <KeyRound className="size-4" aria-hidden />
                </span>
                <div className="flex flex-col">
                  <p className="text-sm font-medium">Add a password</p>
                  <p className="text-muted-foreground text-sm text-pretty">
                    Sign in instantly instead of waiting for an emailed link.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="sm:shrink-0" asChild>
                <Link href="/account/password?next=/dashboard">Set password</Link>
              </Button>
            </div>
          </section>
        )}

        {list.length > 0 && (
          <section aria-label="Where you stand" className="mt-6 flex flex-col gap-3">
            {/* The state-of-play panel. Three equal vanity tiles used to sit
                here; none of them told you what to do next, which is the only
                question this page is asked. */}
            <div className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-2xl px-5 py-5 ring-1 sm:flex-row sm:items-center sm:gap-5">
              {liveNow.length > 0 && (
                <TodayRing done={doneNow} total={liveNow.length} />
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-lg font-semibold text-pretty">
                  {liveNow.length === 0
                    ? "Nothing due right now"
                    : dueCount === 0
                      ? "You're all caught up"
                      : `${dueCount} left to log`}
                </p>
                <p className="text-muted-foreground text-sm text-pretty">
                  {liveNow.length === 0
                    ? "No check-in is open — your next slot will show up here."
                    : dueCount === 0
                      ? `All ${liveNow.length} of your live challenges are covered. Come back tomorrow.`
                      : dueWithStake > 0
                        ? `${dueWithStake} of them ${dueWithStake === 1 ? "has" : "have"} something on the line.`
                        : "Knock them out before the day's gone."}
                </p>
              </div>
              {nextUp && (
                <Button size="lg" className="sm:ml-auto sm:shrink-0" asChild>
                  <Link href={`/challenges/${nextUp.c.id}`}>
                    <span className="max-w-[14rem] truncate">
                      Log &ldquo;{nextUp.c.title}&rdquo;
                    </span>
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              )}
              {!nextUp && liveNow.length > 0 && (
                <span className="text-success ring-success/25 bg-success/[0.07] inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-sm font-medium ring-1 sm:ml-auto sm:self-center">
                  <PartyPopper className="size-4" aria-hidden />
                  Day cleared
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                icon={<Flame className="size-4" aria-hidden />}
                value={currentStreak}
                label="current streak"
                hint={
                  bestStreak > currentStreak ? `best ${bestStreak}` : undefined
                }
              />
              <StatTile
                icon={<TrendingUp className="size-4" aria-hidden />}
                value={consistency === null ? "—" : `${consistency}%`}
                label="consistency"
                hint={
                  closedPeriods > 0
                    ? `${keptPeriods}/${closedPeriods} kept`
                    : "nothing elapsed yet"
                }
              />
              <ActivityTile total={totalCheckIns} days={activity} />
            </div>
          </section>
        )}

        {list.length === 0 ? (
          <section className="mt-10">
            <Card className="border-border/60 border-dashed">
              <CardContent className="mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
                <span className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-xl">
                  <Target className="size-6" aria-hidden />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="font-medium">No challenges yet</p>
                  <p className="text-muted-foreground text-sm text-pretty">
                    Set a daily challenge, put a stake on it, and invite a buddy
                    to hold you to it. It takes about a minute.
                  </p>
                </div>
                <Button size="lg" className="mt-3" asChild>
                  <Link href="/challenges/new">
                    <Plus className="size-4" aria-hidden />
                    Start a challenge
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        ) : (
          <>
            {needsYou.length > 0 && (
              <ChallengeSection
                title="Needs you now"
                count={needsYou.length}
                items={needsYou}
                today={today}
                tone="due"
              />
            )}
            {onTrack.length > 0 && (
              <ChallengeSection
                title="All set"
                count={onTrack.length}
                items={onTrack}
                today={today}
                tone="calm"
              />
            )}
            {finished.length > 0 && (
              <ChallengeSection
                title="Finished"
                count={finished.length}
                items={finished}
                today={today}
                tone="closed"
              />
            )}
          </>
        )}

        {buddyList.length > 0 && (
          <section className="mt-12 flex flex-col gap-4">
            <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              I&apos;m a buddy on
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {buddyList.map(({ token, challenge: c }) => {
                const checkIns: { date: string; value: number }[] =
                  c.check_ins ?? [];
                const ev = evaluateChallenge(
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
                );

                return (
                  <li key={c.id}>
                    <Card className="hover:ring-primary/40 relative h-full transition-all hover:shadow-md hover:-translate-y-0.5">
                      <CardContent className="flex h-full flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <Link
                              href={`/i/${token}`}
                              className="rounded-sm leading-snug font-medium hover:underline after:absolute after:inset-0"
                            >
                              {c.title}
                            </Link>
                            <p className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                              <Eye className="size-3.5" aria-hidden />
                              {ev.dueNow ? "Hasn't checked in yet" : "Covered"}
                            </p>
                          </div>
                          <StreakPill streak={ev.streak} />
                        </div>

                        {ev.percent !== null && (
                          <ProgressBar percent={ev.percent} muted={false} />
                        )}

                        {/* Being a buddy is a job, not a spectator seat — say
                            what the job is. */}
                        <p className="text-primary mt-auto inline-flex items-center gap-1.5 pt-1 text-xs font-medium">
                          <Heart className="size-3.5" aria-hidden />
                          {ev.dueNow ? "Nudge them" : "Send a cheer"}
                        </p>
                      </CardContent>
                    </Card>
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
  stake_text: string | null;
};

type OwnedCard = {
  c: ChallengeRow;
  ev: ChallengeEval;
  dates: string[];
  hasBuddy: boolean;
  cheers: number;
};

function StatTile({
  icon,
  value,
  label,
  hint,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-0.5 rounded-xl px-4 py-3 ring-1">
      <span className="text-primary flex items-center gap-1.5">
        {icon}
        <span className="text-xl font-bold tabular-nums sm:text-2xl">{value}</span>
      </span>
      <span className="text-muted-foreground text-xs">
        {label}
        {hint && <span className="opacity-70"> · {hint}</span>}
      </span>
    </div>
  );
}

/**
 * Done-vs-open across everything that's live right now, as a ring. A part-full
 * ring is a stronger pull than the same fraction set in type — it reads as
 * something you can finish.
 */
function TodayRing({ done, total }: { done: number; total: number }) {
  const degrees = total > 0 ? Math.round((done / total) * 360) : 0;
  return (
    <div
      role="img"
      aria-label={`${done} of ${total} live challenges covered`}
      className="relative grid size-18 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(var(--primary) ${degrees}deg, color-mix(in oklch, var(--muted-foreground), transparent 85%) 0deg)`,
      }}
    >
      <span className="bg-card absolute inset-[7px] rounded-full" />
      <span className="relative text-sm font-bold tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}

/** Check-ins per day for the last fortnight — momentum you can see at a glance. */
function ActivityTile({
  total,
  days,
}: {
  total: number;
  days: { date: string; count: number }[];
}) {
  return (
    <div className="bg-card ring-foreground/10 col-span-2 flex flex-col gap-2 rounded-xl px-4 py-3 ring-1">
      <span className="text-primary flex items-center gap-1.5">
        <Trophy className="size-4" aria-hidden />
        <span className="text-xl font-bold tabular-nums sm:text-2xl">{total}</span>
      </span>
      <div className="flex items-center gap-[3px]" aria-hidden>
        {days.map((d) => (
          <span
            key={d.date}
            title={`${formatDay(d.date)} · ${d.count} check-in${d.count === 1 ? "" : "s"}`}
            className={cn(
              "h-3.5 flex-1 rounded-[3px]",
              d.count === 0
                ? "bg-muted-foreground/15"
                : d.count === 1
                  ? "bg-primary/40"
                  : d.count === 2
                    ? "bg-primary/70"
                    : "bg-primary",
            )}
          />
        ))}
      </div>
      <span className="text-muted-foreground text-xs">
        total check-ins
        <span className="opacity-70">
          {" "}
          · last {days.length} days, to today
        </span>
      </span>
    </div>
  );
}

function StreakPill({ streak }: { streak: number }) {
  return (
    <span className="bg-primary/10 text-primary flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5">
      <Flame className="size-3.5" aria-hidden />
      <span className="text-sm font-semibold tabular-nums">{streak}</span>
      <span className="sr-only">day streak</span>
    </span>
  );
}

function ProgressBar({
  percent,
  muted,
  label,
}: {
  percent: number;
  muted: boolean;
  label?: string;
}) {
  return (
    <div
      className="bg-muted h-2 w-full overflow-hidden rounded-full"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all",
          muted ? "bg-muted-foreground/40" : "bg-primary",
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function ChallengeSection({
  title,
  count,
  items,
  today,
  tone,
}: {
  title: string;
  count: number;
  items: OwnedCard[];
  today: string;
  tone: "due" | "calm" | "closed";
}) {
  return (
    <section className="mt-10 flex flex-col gap-4">
      <h2 className="text-muted-foreground flex items-center gap-2 text-sm font-medium tracking-wide uppercase">
        {title}
        <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-xs tabular-nums">
          {count}
        </span>
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((o) => (
          <li key={o.c.id}>
            <ChallengeCard card={o} today={today} tone={tone} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One owned challenge.
 *
 * The card answers the three questions that decide whether someone acts: how
 * far along am I, what happens if I don't, and who's watching. The stake and
 * the buddy were both already in the database and both only visible a click
 * away, which is exactly one click too far for the thing that supplies the
 * pressure.
 *
 * The title carries a stretched link over the whole card, so the card is still
 * one big target while the check-in button stays a separate control on top of
 * it (nesting a button inside an anchor is neither valid nor operable).
 */
function ChallengeCard({
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

  return (
    <Card
      className={cn(
        "hover:ring-primary/40 relative h-full transition-all hover:-translate-y-0.5 hover:shadow-md",
        tone === "due" && atRisk && "ring-warning/40",
        tone === "closed" && "bg-card/60",
      )}
    >
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link
              href={`/challenges/${c.id}`}
              className="rounded-sm leading-snug font-medium hover:underline after:absolute after:inset-0"
            >
              {c.title}
            </Link>
            <p className="text-muted-foreground text-xs">
              {cadenceLabel(c.cadence, c.cadence_weekday)}
              {ev.status === "failed"
                ? " · failed"
                : ev.status === "won"
                  ? " · done ✓"
                  : ev.status === "upcoming"
                    ? ` · starts ${formatDay(c.start_date)}`
                    : ev.daysRemaining !== null
                      ? ` · ${ev.daysRemaining} days left`
                      : ""}
            </p>
          </div>
          <StreakPill streak={ev.streak} />
        </div>

        {/* What's on the line. The reason any of this works, so it stops being
            a detail-page-only fact. */}
        {c.stake_text && (
          <p className="flex items-start gap-1.5 text-xs">
            <HandCoins
              className={cn(
                "mt-px size-3.5 shrink-0",
                tone === "closed" ? "text-muted-foreground" : "text-primary",
              )}
              aria-hidden
            />
            <span className="min-w-0 line-clamp-1">
              <span className="text-muted-foreground">On the line: </span>
              <span className="font-medium">{c.stake_text}</span>
            </span>
          </p>
        )}

        {ev.percent !== null && (
          <div className="flex flex-col gap-1.5">
            <ProgressBar
              percent={ev.percent}
              muted={ev.status === "failed"}
              label={`${c.title} progress`}
            />
            <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
              <span className="tabular-nums">
                {ev.mode === "total"
                  ? `${formatCount(ev.totalLogged, c.target_unit)} of ${formatCount(ev.totalTarget ?? 0)}`
                  : `${ev.donePeriods}/${ev.totalPeriods} check-ins`}
              </span>
              {atRisk ? (
                <span className="text-warning font-medium">No skips left</span>
              ) : ev.skipsLeft !== null && ev.status === "active" ? (
                <span className="tabular-nums">
                  {ev.skipsLeft} skip{ev.skipsLeft === 1 ? "" : "s"} left
                </span>
              ) : null}
            </div>
          </div>
        )}

        {/* Who's watching, and the one action worth taking. */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <BuddyChip
            hasBuddy={hasBuddy}
            cheers={cheers}
            quiet={tone === "closed"}
          />

          {ev.status === "won" ? (
            <span className="text-success inline-flex shrink-0 items-center gap-1 text-xs font-medium">
              <Trophy className="size-3.5" aria-hidden />
              Completed
            </span>
          ) : ev.status === "failed" ? (
            <span className="text-muted-foreground shrink-0 text-xs font-medium">
              Ended short
            </span>
          ) : ev.status === "upcoming" ? (
            <span className="text-muted-foreground shrink-0 text-xs">
              Not started
            </span>
          ) : !ev.dueNow ? (
            <span className="text-success inline-flex shrink-0 items-center gap-1 text-xs font-medium">
              <CheckCircle2 className="size-3.5" aria-hidden />
              {loggedToday ? "Logged today" : "Covered"}
            </span>
          ) : quickValue !== null ? (
            <div className="relative z-10 shrink-0">
              <QuickLog
                challengeId={c.id}
                value={quickValue}
                streak={ev.streak}
                // Deliberately no unit: the card title already says what's
                // being counted, and a long label pushes the buddy line off
                // the edge of a phone.
                label={
                  ev.mode === "each"
                    ? `Log ${c.daily_target.toLocaleString("en-US")}`
                    : "Log now"
                }
              />
            </div>
          ) : (
            <Button size="sm" variant="outline" className="relative z-10 shrink-0" asChild>
              <Link href={`/challenges/${c.id}`}>
                Log now
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Accountability, stated. "No buddy yet" is deliberately a live prompt rather
 * than a grey fact — an unwitnessed challenge is the one most likely to be
 * quietly dropped.
 */
function BuddyChip({
  hasBuddy,
  cheers,
  quiet,
}: {
  hasBuddy: boolean;
  cheers: number;
  quiet: boolean;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5 text-xs">
      {hasBuddy ? (
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <Users className="size-3.5" aria-hidden />
          Buddy watching
        </span>
      ) : (
        <span
          className={cn(
            "inline-flex items-center gap-1 font-medium",
            quiet ? "text-muted-foreground" : "text-primary",
          )}
        >
          <UserPlus className="size-3.5" aria-hidden />
          Invite a buddy
        </span>
      )}
      {cheers > 0 && (
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <Heart className="size-3.5" aria-hidden />
          <span className="tabular-nums">{cheers}</span>
          <span className="sr-only">
            cheer{cheers === 1 ? "" : "s"} from your buddy
          </span>
        </span>
      )}
    </span>
  );
}
