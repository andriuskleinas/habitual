import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  Flame,
  KeyRound,
  Plus,
  Target,
  Trophy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  cadenceLabel,
  evaluateChallenge,
  formatCount,
  todayISO,
} from "@/lib/challenges";
import { displayName } from "@/lib/profile";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

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

  const { data: challenges } = await supabase
    .from("challenges")
    .select(
      "id, title, cadence, cadence_weekday, daily_target, total_target, target_unit, start_date, end_date, allowance_mode, allowance_value, max_misses_in_row, stake_text, check_ins(date, value)",
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
  const owned = list.map((c) => {
    const checkIns = c.check_ins ?? [];
    return {
      c,
      dates: checkIns.map((ci) => ci.date),
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

  const bestStreak = owned.reduce((max, o) => Math.max(max, o.ev.bestStreak), 0);
  const loggedToday = owned.filter((o) => o.dates.includes(today)).length;
  const totalCheckIns = owned.reduce((n, o) => n + o.dates.length, 0);
  // "Waiting on you" beats "waiting on today" now that a challenge might only
  // want one check-in this whole week.
  const waiting = owned.filter(
    (o) => o.ev.status === "active" && o.ev.dueNow,
  ).length;

  return (
    <>
      <AppHeader profile={names} />

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hey {displayName(names)} 👋
            </h1>
            <p className="text-muted-foreground text-pretty">
              {list.length === 0
                ? "Your challenges will live here."
                : waiting === 0
                  ? "Nothing owing right now. Nice work."
                  : `${waiting} challenge${waiting === 1 ? "" : "s"} waiting on you.`}
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
          <section aria-label="Your stats" className="mt-6 grid grid-cols-3 gap-3">
            <StatTile
              icon={<Flame className="size-4" aria-hidden />}
              value={bestStreak}
              label="best streak"
            />
            <StatTile
              icon={<CheckCircle2 className="size-4" aria-hidden />}
              value={`${loggedToday}/${list.length}`}
              label="logged today"
            />
            <StatTile
              icon={<Trophy className="size-4" aria-hidden />}
              value={totalCheckIns}
              label="total check-ins"
            />
          </section>
        )}

        <section className="mt-10 flex flex-col gap-4">
          <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            My challenges
          </h2>

          {list.length === 0 ? (
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
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {owned.map(({ c, dates, ev }) => {
                const streak = ev.streak;
                const doneToday = dates.includes(today);

                return (
                  <li key={c.id}>
                    <Link
                      href={`/challenges/${c.id}`}
                      className="group/link block h-full rounded-xl"
                    >
                      <Card className="hover:ring-primary/40 hover:shadow-md group-focus-visible/link:ring-primary h-full transition-all group-hover/link:-translate-y-0.5">
                        <CardContent className="flex h-full flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <p className="leading-snug font-medium">{c.title}</p>
                              <p className="text-muted-foreground text-xs">
                                {cadenceLabel(c.cadence, c.cadence_weekday)}
                                {ev.status === "failed"
                                  ? " · failed"
                                  : ev.status === "won"
                                    ? " · done ✓"
                                    : ev.daysRemaining !== null
                                      ? ` · ${ev.daysRemaining} days left`
                                      : ""}
                              </p>
                            </div>
                            <span className="bg-primary/10 text-primary flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5">
                              <Flame className="size-3.5" aria-hidden />
                              <span className="text-sm font-semibold tabular-nums">
                                {streak}
                              </span>
                              <span className="sr-only">day streak</span>
                            </span>
                          </div>

                          {ev.percent !== null && (
                            <div className="mt-auto flex flex-col gap-1.5">
                              <div
                                className="bg-muted h-2 w-full overflow-hidden rounded-full"
                                role="progressbar"
                                aria-valuenow={ev.percent}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${c.title} progress`}
                              >
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    ev.status === "failed"
                                      ? "bg-muted-foreground/40"
                                      : "bg-primary"
                                  }`}
                                  style={{ width: `${ev.percent}%` }}
                                />
                              </div>
                              <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
                                <span className="tabular-nums">
                                  {ev.mode === "total"
                                    ? `${formatCount(ev.totalLogged, c.target_unit)} of ${formatCount(ev.totalTarget ?? 0)}`
                                    : `${ev.donePeriods}/${ev.totalPeriods} check-ins`}
                                </span>
                                {ev.status !== "active" ? null : doneToday ? (
                                  <span className="text-success inline-flex items-center gap-1 font-medium">
                                    <CheckCircle2 className="size-3.5" aria-hidden />
                                    Logged today
                                  </span>
                                ) : ev.skipsLeft === 0 ? (
                                  <span className="text-warning font-medium">
                                    No skips left →
                                  </span>
                                ) : (
                                  <span className="text-primary font-medium">
                                    Log today →
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {buddyList.length > 0 && (
          <section className="mt-12 flex flex-col gap-4">
            <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              I&apos;m a buddy on
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {buddyList.map(({ token, challenge: c }) => {
                const checkIns: { date: string; value: number }[] =
                  c.check_ins ?? [];
                const dates = checkIns.map((ci) => ci.date);
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
                const streak = ev.streak;
                const doneToday = dates.includes(today);

                return (
                  <li key={c.id}>
                    <Link href={`/i/${token}`} className="group/link block h-full rounded-xl">
                      <Card className="hover:ring-primary/40 hover:shadow-md group-focus-visible/link:ring-primary h-full transition-all group-hover/link:-translate-y-0.5">
                        <CardContent className="flex h-full flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <p className="leading-snug font-medium">{c.title}</p>
                              <p className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                                <Eye className="size-3.5" aria-hidden />
                                {doneToday ? "Checked in today" : "Watching"}
                              </p>
                            </div>
                            <span className="bg-primary/10 text-primary flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5">
                              <Flame className="size-3.5" aria-hidden />
                              <span className="text-sm font-semibold tabular-nums">
                                {streak}
                              </span>
                              <span className="sr-only">day streak</span>
                            </span>
                          </div>

                          {ev.percent !== null && (
                            <div
                              className="bg-muted mt-auto h-2 w-full overflow-hidden rounded-full"
                              role="progressbar"
                              aria-valuenow={ev.percent}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${c.title} progress`}
                            >
                              <div
                                className="bg-primary h-full rounded-full transition-all"
                                style={{ width: `${ev.percent}%` }}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <footer className="text-muted-foreground mt-16 border-t pt-6 text-center text-xs">
          Signed in as {user.email} ·{" "}
          <Link href="/account" className="hover:text-foreground underline">
            Profile &amp; settings
          </Link>
        </footer>
      </main>
    </>
  );
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-0.5 rounded-xl px-4 py-3 ring-1">
      <span className="text-primary flex items-center gap-1.5">
        {icon}
        <span className="text-xl font-bold tabular-nums sm:text-2xl">{value}</span>
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
