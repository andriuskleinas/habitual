import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Eye,
  Flame,
  HandCoins,
  KeyRound,
  LifeBuoy,
  Trophy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { claimInvite } from "./actions";
import {
  addDays,
  cadenceLabel,
  describeAllowance,
  evaluateChallenge,
  formatCount,
  formatDay,
  periodNoun,
  schedulePeriods,
  todayISO,
} from "@/lib/challenges";
import { fetchInviteCard, UUID_RE, type InviteView } from "@/lib/invite";
import { Wordmark } from "@/components/brand";
import { BuddyReactions, CheerPrompt } from "@/components/buddy-reactions";
import { parsePendingReaction } from "@/lib/reactions";
import { ChainGrid } from "@/components/chain-grid";
import { ReactionsFeed } from "@/components/reactions-feed";
import { StickyCheerBar } from "@/components/sticky-cheer-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Chat-preview text to sit beside the generated OG image.
 *
 * Named, specific, and current: "Andrius is on day 12 of 30" is a reason to
 * tap; "Watching a challenge" is not. Still `noindex` — an invite link is a
 * capability URL that happens to get pasted into chats, not a public page.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const view = await fetchInviteCard(token);

  if (!view) {
    return {
      title: "Watching a challenge",
      robots: { index: false, follow: false },
    };
  }

  const owner = view.owner_name ?? "Someone";
  const ev = evaluateChallenge(
    {
      cadence: view.cadence,
      cadenceWeekday: view.cadence_weekday,
      startDate: view.start_date,
      endDate: view.end_date,
      allowanceMode: view.allowance_mode,
      allowanceValue: view.allowance_value,
      maxMissesInRow: view.max_misses_in_row,
      dailyTarget: view.daily_target,
      totalTarget: view.total_target,
    },
    view.check_ins ?? [],
    todayISO(),
  );
  const noun = periodNoun(view.cadence);

  const ogTitle = `${owner} is doing "${view.title}" in public`;
  const description = [
    // A brand-new challenge has no numbers worth quoting; say what it is
    // instead of leading a share preview with a zero.
    ev.status === "upcoming"
      ? `Starts ${formatDay(view.start_date, { weekday: true })}`
      : ev.streak > 0
        ? `${ev.streak} ${ev.streak === 1 ? noun.one : noun.many} in a row so far`
        : ev.donePeriods > 0
          ? `${ev.donePeriods} check-ins so far`
          : `${cadenceLabel(view.cadence, view.cadence_weekday)} — day one`,
    view.stake_text ? `On the line: ${view.stake_text}` : null,
    "Watch their streak live and cheer them on.",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: view.title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: "Habitual",
      title: ogTitle,
      description,
      // The image comes from the sibling `opengraph-image` file.
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ r?: string }>;
}) {
  const { token } = await params;
  const { r } = await searchParams;

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

  // Has this buddy turned into a full account holder yet? A magic-link user
  // already has an auth.users row (and even a bcrypt hash), so the only
  // reliable signal is our own `password_set_at`.
  let hasPassword = false;
  let ownsAnyChallenge = false;
  if (isSignedIn && !isOwner) {
    const [{ data: profile }, { count }] = await Promise.all([
      supabase
        .from("users")
        .select("password_set_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("challenges")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id),
    ]);
    hasPassword = !!profile?.password_set_at;
    ownsAnyChallenge = (count ?? 0) > 0;
  }

  const rows = view.check_ins ?? [];
  const reactions = view.reactions ?? [];
  const dates = rows.map((r) => r.date);
  const today = todayISO();

  const rules = {
    cadence: view.cadence,
    cadenceWeekday: view.cadence_weekday,
    startDate: view.start_date,
    endDate: view.end_date,
    allowanceMode: view.allowance_mode,
    allowanceValue: view.allowance_value,
    maxMissesInRow: view.max_misses_in_row,
    dailyTarget: view.daily_target,
    totalTarget: view.total_target,
  };
  const ev = evaluateChallenge(rules, rows, today);
  const periods = schedulePeriods({ ...rules, today });
  const doneSet = new Set(dates);
  const noun = periodNoun(view.cadence);
  const owner = view.owner_name ?? "Someone";
  const loggedToday = dates.includes(today);

  // "Day 12 of 30" — the one number that makes a lone streak of 1 legible as a
  // beginning rather than as a failure.
  const periodIndex = ev.coversToday
    ? Math.min(ev.closedPeriods + 1, ev.totalPeriods ?? Infinity)
    : null;

  // How many distinct people have already reacted. Social proof when it's not
  // zero; a "be first" prompt when it is.
  const cheerers = new Set(
    reactions.map((x) => x.from_name).filter(Boolean),
  ).size;

  const status =
    ev.status === "failed"
      ? "failed"
      : ev.status === "won"
        ? "won"
        : ev.status === "upcoming"
          ? "upcoming"
          : loggedToday || !ev.dueNow
            ? "ok"
            : "due";

  // "today" for a daily challenge, "this week" for a weekly one — the open slot
  // is a period, and calling a weekly slot "today" makes the page look broken.
  const slot = noun.one === "day" ? "today" : `this ${noun.one}`;

  const headline =
    status === "failed"
      ? `${owner} blew it.${view.stake_text ? " Time to collect." : ""}`
      : status === "won"
        ? `${owner} finished the whole run. 🏆`
        : status === "upcoming"
          ? `Starts ${formatDay(view.start_date, { weekday: true })}.`
          : loggedToday
            ? `${owner} checked in today. 🔥`
            : !ev.dueNow
              ? `${owner} is square for this ${noun.one}.`
              : `${owner} hasn't logged ${slot} yet.`;

  // Why *this* visitor matters, right now. The ask lands far better when it's
  // tied to the state of the run than as a generic "send a reaction".
  const pitch =
    status === "failed"
      ? "The rules say it's over. A note lands better than a cheer right now."
      : status === "won"
        ? "They actually did it. That deserves something from you."
        : status === "upcoming"
          ? "Get in early — a cheer waiting on day one is hard to ignore."
          : status === "due"
            ? `The slot for ${slot} is still empty. A nudge from you is the entire point of this link.`
            : ev.streak >= 7
              ? `${ev.streak} ${noun.many} in a row. Tell them you noticed.`
              : ev.donePeriods <= 3
                ? "The first week is where most people quit. A cheer counts most now."
                : "Someone watching is what makes this stick. Take ten seconds.";

  const pending = parsePendingReaction(r);

  return (
    <>
      <header className="bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <span
            className="text-success-ink ring-success/25 bg-success/10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1"
            title="This page updates as they check in"
          >
            <span
              className="bg-success size-1.5 animate-pulse rounded-full"
              aria-hidden
            />
            Live
            <Eye className="size-3.5" aria-hidden />
          </span>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-3xl flex-1 px-5 pt-8 pb-28 sm:px-8 sm:py-12"
      >
        {/* Hero — who, what, and how far in, in one glance */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="from-brand-from to-brand-to text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold uppercase"
              aria-hidden
            >
              {owner.slice(0, 1)}
            </span>
            <p className="text-muted-foreground min-w-0 text-sm text-pretty break-all">
              <span className="text-foreground font-medium">{owner}</span> asked
              you to keep them honest
            </p>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-balance break-all sm:text-3xl">
            {view.title}
          </h1>

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
            <span className="ring-foreground/10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1">
              <CalendarDays className="size-3.5" aria-hidden />
              {cadenceLabel(view.cadence, view.cadence_weekday)}
            </span>
            <span className="ring-foreground/10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1">
              {formatDay(view.start_date)}
              {view.end_date ? ` – ${formatDay(view.end_date)}` : ""}
            </span>
            {periodIndex !== null && ev.totalPeriods !== null && (
              <span className="text-success-ink bg-success/12 inline-flex items-center rounded-full px-2.5 py-1 font-medium">
                {`${noun.one[0].toUpperCase()}${noun.one.slice(1)} ${periodIndex} of ${ev.totalPeriods}`}
              </span>
            )}
          </div>
        </section>

        {/* The stake is the drama — it's why a buddy cares at all */}
        {view.stake_text && (
          <section aria-label="What's on the line" className="mt-5">
            {/* Amber, matching the owner view: the stake is what a watcher is
                here to hold over them. */}
            <div className="ring-cheer/40 from-cheer/20 via-cheer/[0.08] flex items-start gap-3.5 rounded-2xl bg-gradient-to-r to-transparent px-4 py-4 ring-1 sm:px-5">
              <span className="bg-cheer/25 text-cheer-ink flex size-11 shrink-0 items-center justify-center rounded-xl">
                <HandCoins className="size-5" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-cheer-ink text-[0.7rem] font-semibold tracking-widest uppercase">
                  On the line
                </p>
                <p className="text-base font-semibold text-pretty break-all sm:text-lg">
                  {view.stake_text}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Status line — the single fact a buddy opens this link for */}
        <section className="mt-5">
          <div
            className={
              status === "failed"
                ? "ring-destructive/25 bg-destructive/[0.07] flex items-start gap-2.5 rounded-xl px-4 py-3.5 text-sm ring-1"
                : status === "ok" || status === "won"
                  ? "ring-success/25 bg-success/10 flex items-start gap-2.5 rounded-xl px-4 py-3.5 text-sm ring-1"
                  : "ring-foreground/10 bg-muted/40 flex items-start gap-2.5 rounded-xl px-4 py-3.5 text-sm ring-1"
            }
          >
            <span
              className={
                status === "failed"
                  ? "bg-destructive mt-1.5 size-2.5 shrink-0 rounded-full"
                  : status === "ok" || status === "won"
                    ? "bg-success mt-1.5 size-2.5 shrink-0 rounded-full"
                    : "bg-muted-foreground/40 mt-1.5 size-2.5 shrink-0 rounded-full"
              }
              aria-hidden
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium text-pretty">{headline}</span>
              <span className="text-muted-foreground text-pretty">{pitch}</span>
            </span>
          </div>
        </section>

        {/* Buddy action — the page's job. Sits directly under the news, before
            the detail, because that's the moment the reaction is felt. */}
        <section id="cheer" className="mt-5 scroll-mt-24">
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
          ) : (
            <Card className="ring-primary/25 bg-primary/[0.03]">
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1 text-center">
                  <p className="text-lg font-semibold text-balance">
                    Cheer {owner} on
                  </p>
                  <p className="text-muted-foreground text-sm text-pretty">
                    {cheerers > 0
                      ? `${cheerers} ${cheerers === 1 ? "person has" : "people have"} already reacted. They see yours the moment you send it.`
                      : `Be the first to react — ${owner} sees it the moment you send it.`}
                  </p>
                </div>

                {isSignedIn ? (
                  <BuddyReactions
                    token={token}
                    ownerName={owner}
                    pending={pending}
                  />
                ) : (
                  <CheerPrompt token={token} ownerName={owner} />
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Stats */}
        <section
          aria-label="Progress"
          className={`mt-8 grid gap-3 ${
            ev.skipsLeft !== null ? "grid-cols-3" : "grid-cols-2"
          }`}
        >
          <Card size="sm">
            <CardContent className="flex flex-col gap-0.5">
              <span className="text-success-ink flex items-center gap-1">
                <Flame className="size-4" aria-hidden />
                <span className="text-2xl font-bold tabular-nums">
                  {ev.streak}
                </span>
              </span>
              <p className="text-muted-foreground text-xs">
                {noun.one} streak
                {ev.bestStreak > 0 ? ` · best ${ev.bestStreak}` : ""}
              </p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1">
                <Trophy className="text-success-ink size-4" aria-hidden />
                <span className="text-2xl font-bold tabular-nums">
                  {ev.mode === "total"
                    ? ev.totalLogged.toLocaleString("en-US")
                    : ev.donePeriods}
                </span>
                {ev.mode === "total" ? (
                  <span className="text-muted-foreground text-sm">
                    /{(ev.totalTarget ?? 0).toLocaleString("en-US")}
                  </span>
                ) : (
                  ev.totalPeriods && (
                    <span className="text-muted-foreground text-sm">
                      /{ev.totalPeriods}
                    </span>
                  )
                )}
              </span>
              <p className="text-muted-foreground text-xs">
                {ev.mode === "total" ? view.target_unit || "total" : "done"}
                {ev.daysRemaining !== null
                  ? ` · ${ev.daysRemaining} days left`
                  : ""}
              </p>
            </CardContent>
          </Card>
          {ev.skipsLeft !== null && (
            <Card size="sm">
              <CardContent className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1">
                  <LifeBuoy
                    className={
                      ev.skipsLeft === 0
                        ? "text-warning-ink size-4"
                        : "text-primary size-4"
                    }
                    aria-hidden
                  />
                  <span className="text-2xl font-bold tabular-nums">
                    {ev.skipsLeft}
                  </span>
                </span>
                <p className="text-muted-foreground text-xs">
                  skips left{ev.skipsAllowed ? ` of ${ev.skipsAllowed}` : ""}
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {ev.percent !== null && (
          <section className="mt-3 flex flex-col gap-1.5">
            {/* Just the percentage: the stat cards above already carry the
                counts, and a second "days left" figure derived a different way
                only ever reads as a contradiction. */}
            <p className="text-muted-foreground text-xs tabular-nums">
              {ev.percent}% of the run
            </p>
            <div
              className="bg-muted h-2.5 w-full overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={ev.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Challenge completion"
            >
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  status === "failed" ? "bg-muted-foreground/40" : "bg-success"
                }`}
                style={{ width: `${ev.percent}%` }}
              />
            </div>
          </section>
        )}

        {/* The whole run at a glance — makes an early streak of 1 read as
            "just started" instead of "barely trying". */}
        {periods.length > 0 && (
          <section className="mt-3">
            <ChainGrid periods={periods} done={doneSet} today={today} legend />
          </section>
        )}

        {(ev.skipsAllowed !== null || ev.maxMissesInRow !== null) && (
          <p className="text-muted-foreground mt-2.5 text-xs text-pretty">
            The deal:{" "}
            {describeAllowance({
              skipsAllowed: ev.skipsAllowed,
              maxMissesInRow: ev.maxMissesInRow,
              cadence: view.cadence,
            }).toLowerCase()}
          </p>
        )}

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
              {rows.slice(0, 10).map((row) => (
                <li
                  key={row.date}
                  className="ring-foreground/10 flex items-start gap-3 rounded-lg px-3 py-2 ring-1"
                >
                  <span className="bg-success/12 text-success-ink flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                    {formatDay(row.date)}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium tabular-nums">
                      {ev.mode === "each" ? (
                        <>
                          {row.value}{" "}
                          <span className="text-muted-foreground font-normal">
                            / {view.daily_target}
                            {view.target_unit ? ` ${view.target_unit}` : ""}
                          </span>
                        </>
                      ) : ev.mode === "total" ? (
                        `+${formatCount(row.value, view.target_unit)}`
                      ) : (
                        "Done ✓"
                      )}
                      <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                        {row.date === today
                          ? "today"
                          : row.date === addDays(today, -1)
                            ? "yesterday"
                            : ""}
                      </span>
                    </span>
                    {row.note && (
                      <span className="text-muted-foreground text-sm text-pretty break-all">
                        {row.note}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Conversion footer — a watcher is the warmest possible lead, so the
            ask is tailored to exactly how far along they already are. */}
        {!isOwner && (
          <section className="mt-12">
            <div className="ring-primary/20 bg-primary/[0.04] flex flex-col items-center gap-3 rounded-2xl px-6 py-8 text-center">
              {!isSignedIn ? (
                <>
                  <p className="text-lg font-semibold text-balance">
                    Want someone watching your streak?
                  </p>
                  <p className="text-muted-foreground max-w-sm text-sm text-pretty">
                    Create a free account, set your own challenge, and send a
                    link like this one to a friend.
                  </p>
                  <ol className="text-muted-foreground my-1 flex flex-col gap-1.5 text-sm sm:flex-row sm:gap-5">
                    <Step n={1}>Pick a habit</Step>
                    <Step n={2}>Put something on the line</Step>
                    <Step n={3}>Send the link</Step>
                  </ol>
                  <Button size="lg" className="mt-1" asChild>
                    <Link href={`/signup?next=/i/${token}`}>
                      Create a free account
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                </>
              ) : !hasPassword ? (
                <>
                  <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
                    <KeyRound className="size-5" aria-hidden />
                  </span>
                  <p className="text-lg font-semibold text-balance">
                    Finish setting up your account
                  </p>
                  <p className="text-muted-foreground max-w-sm text-sm text-pretty">
                    You&apos;re signed in with an emailed link. Add a password
                    and you can sign in instantly — then start your own
                    challenge and invite someone to watch you.
                  </p>
                  <Button size="lg" className="mt-1" asChild>
                    <Link href={`/account/password?next=/i/${token}`}>
                      Set a password
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                </>
              ) : !ownsAnyChallenge ? (
                <>
                  <p className="text-lg font-semibold text-balance">
                    Your turn — who&apos;s watching you?
                  </p>
                  <p className="text-muted-foreground max-w-sm text-sm text-pretty">
                    You&apos;re holding {owner} accountable. Set your own
                    challenge and send them a link back.
                  </p>
                  <Button size="lg" className="mt-1" asChild>
                    <Link href="/challenges/new">
                      Start your own challenge
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-semibold text-balance">
                    Keep an eye on your own streak too
                  </p>
                  <Button variant="outline" className="mt-1" asChild>
                    <Link href="/dashboard">
                      Go to my dashboard
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </section>
        )}

        <footer className="text-muted-foreground mt-10 text-center text-xs">
          Powered by Habitual · habits stick when someone&apos;s watching
        </footer>
      </main>

      {/* Thumb-reach CTA once the card above has scrolled away (phones only).
          A missed slot calls for a nudge, everything else for a cheer. */}
      {!isOwner && (
        <StickyCheerBar
          watchId="cheer"
          href={
            isSignedIn
              ? "#cheer"
              : `/login?next=${encodeURIComponent(
                  `/i/${token}?r=${status === "due" ? "nudge" : "cheer"}`,
                )}`
          }
          label={
            status === "due"
              ? `👋 Nudge ${owner}`
              : `🎉 Cheer ${owner} on`
          }
        />
      )}
    </>
  );
}

/** Numbered step in the "how it works" strip under the signed-out CTA. */
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-center gap-1.5">
      <span className="bg-primary/10 text-primary flex size-5 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold">
        {n}
      </span>
      {children}
    </li>
  );
}
