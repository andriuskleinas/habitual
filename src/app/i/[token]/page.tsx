import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Eye,
  Flame,
  HandCoins,
  Trophy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { claimInvite } from "./actions";
import {
  cadenceLabel,
  challengeProgress,
  currentStreak,
  longestStreak,
  todayISO,
} from "@/lib/challenges";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { BuddyReactions } from "@/components/buddy-reactions";
import { ReactionsFeed, type ReactionItem } from "@/components/reactions-feed";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Watching a challenge",
  // Invite links get pasted into chats; the page itself shouldn't be indexed.
  robots: { index: false, follow: false },
};

/** Shape returned by the `challenge_by_invite` RPC (jsonb). */
type InviteView = {
  id: string;
  title: string;
  cadence: string;
  daily_target: number;
  start_date: string;
  end_date: string | null;
  stake_text: string | null;
  owner_name: string | null;
  invite_status: string;
  buddy_claimed: boolean;
  viewer_is_owner: boolean | null;
  viewer_is_buddy: boolean | null;
  check_ins: { date: string; value: number; note: string | null }[];
  reactions: ReactionItem[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // A malformed token would make the uuid-typed RPC arg throw — bail early.
  if (!UUID_RE.test(token)) notFound();

  const supabase = await createClient();

  const [{ data }, { data: auth }] = await Promise.all([
    // Read-only, NO auth: the SECURITY DEFINER RPC returns the challenge only
    // when the invite token matches, so anyone with the link can watch.
    supabase.rpc("challenge_by_invite", { p_token: token }),
    supabase.auth.getUser(),
  ]);

  const view = data as InviteView | null;
  if (!view) notFound();

  const user = auth.user;
  const isSignedIn = user !== null;
  const isOwner = view.viewer_is_owner === true;

  // Claim on sign-in: the moment an identified, non-owner watcher lands here we
  // attach them as a buddy (idempotent; no revalidate so it's render-safe).
  if (isSignedIn && !isOwner && view.viewer_is_buddy !== true) {
    await claimInvite(token);
  }

  const rows = view.check_ins ?? [];
  const reactions = view.reactions ?? [];
  const dates = rows.map((r) => r.date);
  const today = todayISO();

  const streak = currentStreak(dates, today);
  const best = longestStreak(dates);
  const progress = challengeProgress({
    startDate: view.start_date,
    endDate: view.end_date,
    completedDays: new Set(dates).size,
    today,
  });
  const owner = view.owner_name ?? "Someone";
  const loggedToday = dates.includes(today);

  return (
    <>
      <header className="bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
              <span className="bg-success size-1.5 animate-pulse rounded-full" aria-hidden />
              Live
              <Eye className="size-3.5" aria-hidden />
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8 sm:py-12"
      >
        <section className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm">
            You&apos;re watching{" "}
            <span className="text-foreground font-medium">{owner}</span>&apos;s
            challenge
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            {view.title}
          </h1>
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <CalendarDays className="size-3.5" aria-hidden />
            <span>
              {cadenceLabel(view.cadence)} · {formatDay(view.start_date)}
              {view.end_date ? ` – ${formatDay(view.end_date)}` : ""}
            </span>
          </p>
        </section>

        {view.stake_text && (
          <section className="mt-5">
            <div className="bg-accent/60 text-accent-foreground flex items-start gap-2.5 rounded-xl px-4 py-3">
              <HandCoins className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p className="text-sm text-pretty">
                <span className="font-medium">On the line: </span>
                {view.stake_text}
              </p>
            </div>
          </section>
        )}

        {/* Status line — the single fact a buddy opens this link for */}
        <section className="mt-6">
          <div
            className={
              loggedToday
                ? "ring-success/25 bg-success/10 flex items-center gap-2.5 rounded-xl px-4 py-3.5 text-sm ring-1"
                : "ring-foreground/10 bg-muted/40 flex items-center gap-2.5 rounded-xl px-4 py-3.5 text-sm ring-1"
            }
          >
            <span
              className={
                loggedToday
                  ? "bg-success size-2.5 shrink-0 rounded-full"
                  : "bg-muted-foreground/40 size-2.5 shrink-0 rounded-full"
              }
              aria-hidden
            />
            <span className="font-medium text-pretty">
              {loggedToday
                ? `${owner} checked in today. 🔥`
                : `${owner} hasn't logged today yet.`}
            </span>
          </div>
        </section>

        {/* Stats */}
        <section aria-label="Progress" className="mt-4 grid grid-cols-2 gap-3">
          <Card size="sm">
            <CardContent className="flex flex-col gap-0.5">
              <span className="text-primary flex items-center gap-1">
                <Flame className="size-4" aria-hidden />
                <span className="text-2xl font-bold tabular-nums">{streak}</span>
              </span>
              <p className="text-muted-foreground text-xs">
                day streak{best > 0 ? ` · best ${best}` : ""}
              </p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1">
                <Trophy className="text-primary size-4" aria-hidden />
                <span className="text-2xl font-bold tabular-nums">
                  {progress.completedDays}
                </span>
                {progress.totalDays && (
                  <span className="text-muted-foreground text-sm">
                    /{progress.totalDays}
                  </span>
                )}
              </span>
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
            <div
              className="bg-muted h-2.5 w-full overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={progress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Challenge completion"
            >
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </section>
        )}

        {/* Buddy action — cheer / nudge / note (claims the invite on first tap) */}
        <section className="mt-8">
          {isOwner ? (
            <Card className="border-border/60 border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
                <p className="font-medium">This is your challenge</p>
                <p className="text-muted-foreground text-sm text-pretty">
                  This is exactly what your buddy sees. Manage it from the owner
                  view.
                </p>
                <Button variant="outline" className="mt-2" asChild>
                  <Link href={`/challenges/${view.id}`}>
                    Open owner view
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : isSignedIn ? (
            <Card>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <p className="font-medium">Cheer {owner} on</p>
                  <p className="text-muted-foreground text-sm text-pretty">
                    You&apos;re their accountability buddy. Send a reaction.
                  </p>
                </div>
                <BuddyReactions token={token} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary/30 bg-primary/[0.04] border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
                <p className="text-lg font-semibold">Cheer {owner} on</p>
                <p className="text-muted-foreground max-w-sm text-sm text-pretty">
                  Sign in to react and become their accountability buddy — one
                  tap, no password.
                </p>
                <Button size="lg" className="mt-3" asChild>
                  <Link href={`/login?next=/i/${token}`}>Sign in to cheer</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Reactions wall */}
        {reactions.length > 0 && (
          <section className="mt-8 flex flex-col gap-3">
            <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              Reactions
            </h2>
            <ReactionsFeed reactions={reactions} />
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
                  key={r.date}
                  className="ring-foreground/10 flex items-start gap-3 rounded-lg px-3 py-2 ring-1"
                >
                  <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                    {formatDay(r.date)}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    {view.daily_target > 1 && (
                      <span className="text-sm font-medium tabular-nums">
                        {r.value}{" "}
                        <span className="text-muted-foreground font-normal">
                          / {view.daily_target}
                        </span>
                      </span>
                    )}
                    {r.note ? (
                      <span className="text-muted-foreground text-sm text-pretty">
                        {r.note}
                      </span>
                    ) : (
                      view.daily_target <= 1 && (
                        <span className="text-sm">Done ✓</span>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Conversion footer — a watcher is the warmest possible lead */}
        <section className="mt-12">
          <div className="ring-foreground/10 bg-muted/40 flex flex-col items-center gap-3 rounded-2xl px-6 py-8 text-center">
            <p className="font-semibold text-balance">
              Want someone watching your streak?
            </p>
            <p className="text-muted-foreground max-w-sm text-sm text-pretty">
              Set your own challenge, put something on the line, and send a link
              like this one.
            </p>
            <Button className="mt-1" asChild>
              <Link href="/">
                Start your own challenge
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </section>

        <footer className="text-muted-foreground mt-10 text-center text-xs">
          Powered by Habitual · habits stick when someone&apos;s watching
        </footer>
      </main>
    </>
  );
}
