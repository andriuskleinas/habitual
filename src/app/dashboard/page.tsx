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
  challengeProgress,
  currentStreak,
  longestStreak,
  todayISO,
} from "@/lib/challenges";
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
    .select("name, email, password_set_at")
    .eq("id", user.id)
    .single();

  const { data: challenges } = await supabase
    .from("challenges")
    .select(
      "id, title, cadence, daily_target, start_date, end_date, stake_text, check_ins(date)",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  // "I'm a buddy on": challenges this user was invited to and claimed. RLS lets
  // a claimed buddy read the challenge + its check-ins; the owner's name isn't
  // buddy-readable, so these cards link to the token (buddy) view instead.
  const { data: buddyRows } = await supabase
    .from("buddies")
    .select(
      "invite_token, challenge:challenges(id, title, cadence, start_date, end_date, check_ins(date))",
    )
    .eq("buddy_user_id", user.id)
    .eq("status", "claimed")
    .order("created_at", { ascending: false });

  const displayName = profile?.name ?? user.email?.split("@")[0] ?? "there";
  const today = todayISO();
  const list = challenges ?? [];
  const buddyList = (buddyRows ?? []).flatMap((b) => {
    const c = Array.isArray(b.challenge) ? b.challenge[0] : b.challenge;
    return c ? [{ token: b.invite_token, challenge: c }] : [];
  });

  // Roll-up stats across every owned challenge, so the dashboard answers
  // "how am I doing?" before you open anything.
  const allDates = list.flatMap((c) => (c.check_ins ?? []).map((ci) => ci.date));
  const bestStreak = list.reduce(
    (max, c) => Math.max(max, longestStreak((c.check_ins ?? []).map((ci) => ci.date))),
    0,
  );
  const loggedToday = list.filter((c) =>
    (c.check_ins ?? []).some((ci) => ci.date === today),
  ).length;
  const totalCheckIns = allDates.length;

  return (
    <>
      <AppHeader />

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        <section className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Hey {displayName} 👋
          </h1>
          <p className="text-muted-foreground text-pretty">
            {list.length === 0
              ? "Your challenges will live here."
              : loggedToday === list.length
                ? "Everything logged for today. Nice work."
                : `${list.length - loggedToday} challenge${
                    list.length - loggedToday === 1 ? "" : "s"
                  } still waiting on today's check-in.`}
          </p>
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
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              My challenges
            </h2>
            {list.length > 0 && (
              <Button size="sm" variant="outline" asChild>
                <Link href="/challenges/new">
                  <Plus className="size-4" aria-hidden />
                  New
                </Link>
              </Button>
            )}
          </div>

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
              {list.map((c) => {
                const dates = (c.check_ins ?? []).map((ci) => ci.date);
                const streak = currentStreak(dates, today);
                const progress = challengeProgress({
                  startDate: c.start_date,
                  endDate: c.end_date,
                  completedDays: new Set(dates).size,
                  today,
                });
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
                                {cadenceLabel(c.cadence)}
                                {progress.totalDays
                                  ? ` · ${progress.daysRemaining} days left`
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

                          {progress.percent !== null && (
                            <div className="mt-auto flex flex-col gap-1.5">
                              <div
                                className="bg-muted h-2 w-full overflow-hidden rounded-full"
                                role="progressbar"
                                aria-valuenow={progress.percent}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${c.title} progress`}
                              >
                                <div
                                  className="bg-primary h-full rounded-full transition-all"
                                  style={{ width: `${progress.percent}%` }}
                                />
                              </div>
                              <div className="text-muted-foreground flex items-center justify-between text-xs">
                                <span className="tabular-nums">
                                  {progress.completedDays}/{progress.totalDays} days
                                </span>
                                {doneToday ? (
                                  <span className="text-success inline-flex items-center gap-1 font-medium">
                                    <CheckCircle2 className="size-3.5" aria-hidden />
                                    Logged today
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
                const dates = (c.check_ins ?? []).map(
                  (ci: { date: string }) => ci.date,
                );
                const streak = currentStreak(dates, today);
                const progress = challengeProgress({
                  startDate: c.start_date,
                  endDate: c.end_date,
                  completedDays: new Set(dates).size,
                  today,
                });
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

                          {progress.percent !== null && (
                            <div
                              className="bg-muted mt-auto h-2 w-full overflow-hidden rounded-full"
                              role="progressbar"
                              aria-valuenow={progress.percent}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${c.title} progress`}
                            >
                              <div
                                className="bg-primary h-full rounded-full transition-all"
                                style={{ width: `${progress.percent}%` }}
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
          Signed in as {user.email}
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
