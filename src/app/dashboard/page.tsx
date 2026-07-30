import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Flame, LogOut, Plus, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import {
  cadenceLabel,
  challengeProgress,
  currentStreak,
  todayISO,
} from "@/lib/challenges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
    .select("name, email")
    .eq("id", user.id)
    .single();

  const { data: challenges } = await supabase
    .from("challenges")
    .select(
      "id, title, cadence, daily_target, start_date, end_date, stake_text, check_ins(date)",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const displayName = profile?.name ?? user.email?.split("@")[0] ?? "there";
  const today = todayISO();
  const list = challenges ?? [];

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <Flame className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Habitual</span>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </header>

      <section className="mt-12 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Hey {displayName} 👋
        </h1>
        <p className="text-muted-foreground text-pretty">
          {list.length === 0
            ? "Your challenges will live here."
            : "Keep the streak alive. Log today's progress."}
        </p>
      </section>

      <section className="mt-8 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            My challenges
          </h2>
          {list.length > 0 && (
            <Button size="sm" variant="outline" asChild>
              <Link href="/challenges/new">
                <Plus className="size-4" />
                New
              </Link>
            </Button>
          )}
        </div>

        {list.length === 0 ? (
          <Card className="border-border/60 border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-xl">
                <Target className="size-6" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-medium">No challenges yet</p>
                <p className="text-muted-foreground text-sm text-pretty">
                  Set a daily challenge, put a stake on it, and invite a buddy to
                  hold you to it.
                </p>
              </div>
              <Button className="mt-2" asChild>
                <Link href="/challenges/new">
                  <Plus className="size-4" />
                  Start a challenge
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          list.map((c) => {
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
              <Link key={c.id} href={`/challenges/${c.id}`} className="group/link">
                <Card className="border-border/60 transition-colors group-hover/link:ring-foreground/20">
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <p className="leading-snug font-medium">{c.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {cadenceLabel(c.cadence)}
                          {progress.totalDays
                            ? ` · ${progress.daysRemaining} days left`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                        <Flame className="size-3.5" />
                        <span className="text-sm font-semibold tabular-nums">
                          {streak}
                        </span>
                      </div>
                    </div>

                    {progress.percent !== null && (
                      <div className="flex flex-col gap-1.5">
                        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                        <div className="text-muted-foreground flex items-center justify-between text-xs">
                          <span>
                            {progress.completedDays}/{progress.totalDays} days
                          </span>
                          {doneToday ? (
                            <span className="text-primary inline-flex items-center gap-1 font-medium">
                              <CheckCircle2 className="size-3.5" />
                              Logged today
                            </span>
                          ) : (
                            <span>Tap to log today</span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </section>

      <footer className="text-muted-foreground mt-auto pt-16 text-center text-xs">
        Signed in as {user.email}
      </footer>
    </main>
  );
}
