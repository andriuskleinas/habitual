import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  cadenceLabel,
  evaluateChallenge,
  schedulePeriods,
  todayISO,
  type ChallengeEval,
} from "@/lib/challenges";
import { CATEGORIES, categorize, categoryById } from "@/lib/categories";
import { displayName } from "@/lib/profile";
import { AppHeader } from "@/components/app-header";
import { MiniChain } from "@/components/chain-grid";
import {
  DashboardSummary,
  type CategoryStat,
} from "@/components/dashboard/summary";
import {
  ChallengeBoard,
  ChallengeGrid,
  ChallengeList,
  ViewSwitch,
  type DashboardGroup,
  type DashboardView,
  type Group,
  type OwnedCard,
} from "@/components/dashboard/views";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

/** How far back the activity chart looks: a month reads as "lately". */
const ACTIVITY_DAYS = 30;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; group?: string }>;
}) {
  const params = await searchParams;
  const view: DashboardView =
    params.view === "grid" || params.view === "board" ? params.view : "list";
  const group: DashboardGroup = params.group === "status" ? "status" : "category";

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
  // then reuse it for the summary and every view below.
  const owned: OwnedCard[] = list.map((c) => {
    const checkIns = c.check_ins ?? [];
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
    return {
      c,
      dates: checkIns.map((ci) => ci.date),
      periods: schedulePeriods({ ...rules, today }),
      category: categoryById(categorize(c.title)),
      hasBuddy: (c.buddies ?? []).some((b) => b.status === "claimed"),
      cheers: (c.reactions ?? []).length,
      ev: evaluateChallenge(rules, checkIns, today),
    };
  });

  /* ------------------------------- Summary --------------------------------- */

  const isDue = (ev: ChallengeEval) => ev.status === "active" && ev.dueNow;
  const dueCount = owned.filter((o) => isDue(o.ev)).length;
  const activeCount = owned.filter((o) => o.ev.status === "active").length;
  const allDates = owned.flatMap((o) => o.dates);

  const perDay = new Map<string, number>();
  for (const d of allDates) perDay.set(d, (perDay.get(d) ?? 0) + 1);
  const activity = Array.from({ length: ACTIVITY_DAYS }, (_, i) => {
    const date = addDays(today, i - (ACTIVITY_DAYS - 1));
    return { date, count: perDay.get(date) ?? 0 };
  });

  // Consistency over every slot that has actually elapsed: the one number
  // here that can go down, and the only one that says whether this works.
  const keptOf = (o: OwnedCard) => o.ev.closedPeriods - o.ev.missedPeriods;

  const categoryStats: CategoryStat[] = CATEGORIES.map((category) => {
    const mine = owned.filter((o) => o.category.id === category.id);
    return {
      category,
      total: mine.length,
      active: mine.filter((o) => o.ev.status === "active").length,
      upcoming: mine.filter((o) => o.ev.status === "upcoming").length,
      won: mine.filter((o) => o.ev.status === "won").length,
      lost: mine.filter((o) => o.ev.status === "failed").length,
      kept: mine.reduce((n, o) => n + keptOf(o), 0),
      closed: mine.reduce((n, o) => n + o.ev.closedPeriods, 0),
    };
  })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);

  const summary = {
    active: activeCount,
    dueNow: dueCount,
    won: owned.filter((o) => o.ev.status === "won").length,
    lost: owned.filter((o) => o.ev.status === "failed").length,
    kept: owned.reduce((n, o) => n + keptOf(o), 0),
    closed: owned.reduce((n, o) => n + o.ev.closedPeriods, 0),
    bestStreak: Math.max(0, ...owned.map((o) => o.ev.bestStreak)),
    currentStreak: Math.max(0, ...owned.map((o) => o.ev.streak)),
    activity,
    totalCheckIns: allDates.length,
    lastCheckIn: allDates.length ? allDates.reduce((a, b) => (a > b ? a : b)) : null,
    categories: categoryStats,
  };

  /* ------------------------------- Grouping -------------------------------- */

  // Inside any group, what needs you comes first, then what's running, then
  // what's coming, then what's over. Ties: whatever runs out soonest.
  const rank = (ev: ChallengeEval) =>
    isDue(ev)
      ? 0
      : ev.status === "active"
        ? 1
        : ev.status === "upcoming"
          ? 2
          : ev.status === "won"
            ? 3
            : 4;
  const byUrgency = (a: OwnedCard, b: OwnedCard) =>
    rank(a.ev) - rank(b.ev) ||
    (a.ev.skipsLeft === 0 ? 0 : 1) - (b.ev.skipsLeft === 0 ? 0 : 1) ||
    (a.ev.daysRemaining ?? 9999) - (b.ev.daysRemaining ?? 9999) ||
    b.ev.streak - a.ev.streak;

  const categoryGroups: Group[] = categoryStats.map((s) => ({
    key: s.category.id,
    title: s.category.label,
    dot: s.category.dot,
    items: owned.filter((o) => o.category.id === s.category.id).sort(byUrgency),
  }));

  const statusGroups: Group[] = [
    {
      key: "due",
      title: "Needs you now",
      items: owned.filter((o) => isDue(o.ev)).sort(byUrgency),
    },
    {
      key: "set",
      title: "All set",
      items: owned
        .filter(
          (o) =>
            (o.ev.status === "active" && !o.ev.dueNow) || o.ev.status === "upcoming",
        )
        .sort(byUrgency),
    },
    {
      key: "done",
      title: "Finished",
      items: owned
        .filter((o) => o.ev.status === "won" || o.ev.status === "failed")
        .sort(byUrgency),
    },
  ].filter((g) => g.items.length > 0);

  const groups = view === "board" || group === "category" ? categoryGroups : statusGroups;

  const status =
    list.length === 0
      ? "Your challenges will live here."
      : activeCount === 0
        ? "Nothing running right now. Start the next one when you're ready."
        : dueCount === 0
          ? `${activeCount} running, all logged. Come back tomorrow.`
          : `${dueCount} of ${activeCount} running challenge${activeCount === 1 ? "" : "s"} need${dueCount === 1 ? "s" : ""} a check-in.`;

  return (
    <>
      <AppHeader profile={names} />

      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14"
      >
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-muted-foreground text-sm">{longDate(today)}</p>
            <h1 className="text-[clamp(2.25rem,5vw,3.25rem)] leading-none tracking-[-0.045em] text-balance">
              Hi, {displayName(names)}
            </h1>
            <p className="text-muted-foreground text-pretty">{status}</p>
          </div>
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
            <DashboardSummary data={summary} />

            <div className="mt-14 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-[clamp(1.75rem,3.5vw,2.25rem)] leading-none tracking-[-0.04em]">
                Your challenges
              </h2>
              <ViewSwitch view={view} group={group} />
            </div>

            {view === "board" ? (
              <ChallengeBoard groups={groups} today={today} />
            ) : view === "grid" ? (
              <ChallengeGrid groups={groups} today={today} />
            ) : (
              <ChallengeList groups={groups} today={today} />
            )}
          </>
        )}

        {buddyList.length > 0 && (
          <section className="mt-14">
            <h2 className="flex items-baseline gap-2.5 text-xl tracking-[-0.025em]">
              I&apos;m a buddy on
              <span className="text-muted-foreground text-sm tabular-nums">
                {buddyList.length}
              </span>
            </h2>
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

                return (
                  <li
                    key={c.id}
                    className="hover:bg-muted/40 relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-3 px-5 py-4 transition-colors first:rounded-t-3xl last:rounded-b-3xl sm:px-6 md:grid-cols-[minmax(0,1fr)_13rem_auto]"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/i/${token}`}
                        className="rounded-sm text-[17px] leading-snug tracking-[-0.015em] break-words after:absolute after:inset-0 hover:underline"
                      >
                        {c.title}
                      </Link>
                      <p className="text-muted-foreground mt-0.5 text-[13px]">
                        {cadenceLabel(c.cadence, c.cadence_weekday)} ·{" "}
                        {ev.dueNow ? "hasn't checked in yet" : "covered"} ·{" "}
                        {ev.streak} streak
                      </p>
                    </div>
                    <MiniChain
                      periods={schedulePeriods({ ...rules, today })}
                      done={new Set(checkIns.map((ci) => ci.date))}
                      today={today}
                      className="col-span-2 md:col-span-1"
                    />
                    {/* Being a buddy is a job, not a spectator seat: say what
                        the job is. */}
                    <span className="text-cheer-ink row-start-1 justify-self-end text-sm font-medium md:col-start-3">
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

/** "Monday 9 November", on the same UTC calendar the rest of the app uses. */
function longDate(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}
