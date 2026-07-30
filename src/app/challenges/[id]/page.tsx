import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Flame, HandCoins, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  cadenceLabel,
  challengeProgress,
  currentStreak,
  longestStreak,
  todayISO,
} from "@/lib/challenges";
import { CheckInForm } from "@/components/check-in-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Challenge" };

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/challenges/${id}`);

  const { data: challenge } = await supabase
    .from("challenges")
    .select(
      "id, owner_id, title, cadence, daily_target, start_date, end_date, stake_text",
    )
    .eq("id", id)
    .maybeSingle();

  if (!challenge) notFound();

  const { data: checkIns } = await supabase
    .from("check_ins")
    .select("id, date, value, note")
    .eq("challenge_id", id)
    .order("date", { ascending: false });

  const isOwner = challenge.owner_id === user.id;
  const rows = checkIns ?? [];
  const dates = rows.map((r) => r.date);
  const today = todayISO();

  const streak = currentStreak(dates, today);
  const best = longestStreak(dates);
  const progress = challengeProgress({
    startDate: challenge.start_date,
    endDate: challenge.end_date,
    completedDays: new Set(dates).size,
    today,
  });
  const todayRow = rows.find((r) => r.date === today) ?? null;

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
      </header>

      <section className="mt-8 flex flex-col gap-2">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <CalendarDays className="size-3.5" />
          <span>
            {cadenceLabel(challenge.cadence)} · {formatDay(challenge.start_date)}
            {challenge.end_date ? ` – ${formatDay(challenge.end_date)}` : ""}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-balance">
          {challenge.title}
        </h1>
      </section>

      {challenge.stake_text && (
        <section className="mt-4">
          <div className="bg-accent/60 text-accent-foreground flex items-start gap-2.5 rounded-xl px-4 py-3">
            <HandCoins className="mt-0.5 size-4 shrink-0" />
            <p className="text-sm text-pretty">
              <span className="font-medium">On the line: </span>
              {challenge.stake_text}
            </p>
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="mt-6 grid grid-cols-2 gap-3">
        <Card size="sm">
          <CardContent className="flex flex-col gap-0.5">
            <div className="text-primary flex items-center gap-1">
              <Flame className="size-4" />
              <span className="text-2xl font-bold tabular-nums">{streak}</span>
            </div>
            <p className="text-muted-foreground text-xs">
              day streak{best > 0 ? ` · best ${best}` : ""}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <Trophy className="text-primary size-4" />
              <span className="text-2xl font-bold tabular-nums">
                {progress.completedDays}
              </span>
              {progress.totalDays && (
                <span className="text-muted-foreground text-sm">
                  /{progress.totalDays}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              days done
              {progress.daysRemaining !== null
                ? ` · ${progress.daysRemaining} left`
                : ""}
            </p>
          </CardContent>
        </Card>
      </section>

      {progress.percent !== null && (
        <section className="mt-3">
          <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </section>
      )}

      {/* Today's check-in (owner only) */}
      {isOwner ? (
        <section className="mt-8 flex flex-col gap-3">
          <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            {todayRow ? "Today — logged ✓" : "Log today"}
          </h2>
          <CheckInForm
            challengeId={challenge.id}
            dailyTarget={challenge.daily_target}
            today={
              todayRow ? { value: todayRow.value, note: todayRow.note } : null
            }
          />
        </section>
      ) : (
        <section className="mt-8">
          <p className="text-muted-foreground text-sm">
            You&apos;re watching this challenge. Reactions land in a later wave.
          </p>
        </section>
      )}

      {/* Recent activity */}
      {rows.length > 0 && (
        <section className="mt-8 flex flex-col gap-3">
          <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            Recent
          </h2>
          <ul className="flex flex-col gap-2">
            {rows.slice(0, 10).map((r) => (
              <li
                key={r.id}
                className="ring-foreground/10 flex items-start gap-3 rounded-lg px-3 py-2 ring-1"
              >
                <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                  {formatDay(r.date)}
                </div>
                <div className="flex min-w-0 flex-col">
                  {challenge.daily_target > 1 && (
                    <span className="text-sm font-medium tabular-nums">
                      {r.value}{" "}
                      <span className="text-muted-foreground font-normal">
                        / {challenge.daily_target}
                      </span>
                    </span>
                  )}
                  {r.note ? (
                    <span className="text-muted-foreground text-sm text-pretty">
                      {r.note}
                    </span>
                  ) : (
                    challenge.daily_target <= 1 && (
                      <span className="text-sm">Done ✓</span>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
