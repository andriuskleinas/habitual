import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        ? `${owner} finished the whole run.`
        : status === "upcoming"
          ? `Starts ${formatDay(view.start_date, { weekday: true })}.`
          : loggedToday
            ? `${owner} checked in today.`
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
          ? "Get in early. A cheer waiting on day one is hard to ignore."
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
      <header className="bg-background/85 border-border sticky top-0 z-50 w-full border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <span
            className="text-success-ink inline-flex items-center gap-2 text-sm"
            title="This page updates as they check in"
          >
            <span
              className="bg-success size-2 animate-pulse rounded-full"
              aria-hidden
            />
            Live
          </span>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-3xl flex-1 px-5 pt-10 pb-28 sm:px-8 sm:py-14"
      >
        {/* Who, what, and how far in, in one glance */}
        <section>
          <p className="text-muted-foreground flex items-center gap-2.5 text-sm text-pretty">
            <span
              className="bg-pastel-lavender text-pastel-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium uppercase"
              aria-hidden
            >
              {owner.slice(0, 1)}
            </span>
            <span className="min-w-0 break-words">
              <span className="text-foreground">{owner}</span> asked you to keep
              them honest
            </span>
          </p>

          <h1 className="mt-5 text-[clamp(2.25rem,6vw,3.75rem)] leading-[0.98] tracking-[-0.05em] text-balance break-words">
            {view.title}
          </h1>

          <p className="text-muted-foreground mt-4 text-sm">
            {[
              cadenceLabel(view.cadence, view.cadence_weekday),
              `${formatDay(view.start_date)}${view.end_date ? ` – ${formatDay(view.end_date)}` : ""}`,
              periodIndex !== null && ev.totalPeriods !== null
                ? `${noun.one} ${periodIndex} of ${ev.totalPeriods}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </section>

        {/* The stake is the drama: it's why a buddy cares at all. Same ruled
            quote as the owner view. */}
        {view.stake_text && (
          <section
            aria-label="What's on the line"
            className="border-border mt-8 grid gap-2 border-y py-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline sm:gap-6"
          >
            <p className="text-cheer-ink text-xs font-medium tracking-[0.1em] uppercase">
              On the line
            </p>
            <p className="font-serif text-[clamp(1.5rem,3.4vw,2rem)] leading-[1.1] text-pretty break-words italic">
              {view.stake_text}
            </p>
          </section>
        )}

        {/* The news and the ask, together: the reaction lands best at the
            moment the visitor reads the state of the run. */}
        <section
          id="cheer"
          className="bg-muted/60 mt-8 scroll-mt-24 rounded-3xl p-5 sm:p-7"
        >
          <p className="flex items-start gap-3">
            <span
              className={cn(
                "mt-2.5 size-2.5 shrink-0 rounded-full",
                status === "failed"
                  ? "bg-destructive"
                  : status === "ok" || status === "won"
                    ? "bg-success"
                    : "bg-muted-foreground/40",
              )}
              aria-hidden
            />
            <span className="text-2xl leading-tight tracking-[-0.03em] text-balance">
              {headline}
            </span>
          </p>
          <p className="text-muted-foreground mt-2 pl-5.5 text-pretty">{pitch}</p>

          <div className="mt-6">
            {isOwner ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-pretty">
                  This is your challenge, exactly as your buddy sees it.
                </p>
                <Button variant="outline" asChild>
                  <Link href={`/challenges/${view.id}`}>
                    Open owner view
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-muted-foreground text-sm text-pretty">
                  {cheerers > 0
                    ? `${cheerers} ${cheerers === 1 ? "person has" : "people have"} already reacted. ${owner} sees yours the moment you send it.`
                    : `Be the first to react. ${owner} sees it the moment you send it.`}
                </p>
                {isSignedIn ? (
                  <BuddyReactions
                    token={token}
                    ownerName={owner}
                    pending={pending}
                  />
                ) : (
                  <CheerPrompt token={token} ownerName={owner} />
                )}
              </div>
            )}
          </div>
        </section>

        {/* The scoreboard */}
        <section aria-label="Progress" className="mt-12 flex flex-col gap-8">
          <div className={cn("grid", ev.skipsLeft !== null ? "grid-cols-3" : "grid-cols-2")}>
            <Figure
              label="Streak"
              value={ev.streak.toLocaleString("en-US")}
              unit={ev.bestStreak > ev.streak ? `best ${ev.bestStreak}` : `${noun.one}s`}
              tone={status === "failed" ? undefined : "kept"}
            />
            <Figure
              label={ev.mode === "total" ? view.target_unit || "Total" : "Done"}
              value={(ev.mode === "total" ? ev.totalLogged : ev.donePeriods).toLocaleString("en-US")}
              unit={
                ev.mode === "total"
                  ? `of ${(ev.totalTarget ?? 0).toLocaleString("en-US")}`
                  : ev.totalPeriods
                    ? `of ${ev.totalPeriods}`
                    : ""
              }
              className="border-border border-l pl-4 sm:pl-6"
            />
            {ev.skipsLeft !== null && (
              <Figure
                label="Skips left"
                value={String(ev.skipsLeft)}
                unit={ev.skipsAllowed ? `of ${ev.skipsAllowed}` : ""}
                tone={ev.skipsLeft === 0 ? "warning" : undefined}
                className="border-border border-l pl-4 sm:pl-6"
              />
            )}
          </div>

          {/* The whole run at a glance: makes an early streak of 1 read as
              "just started" instead of "barely trying". */}
          {periods.length > 0 && (
            <ChainGrid periods={periods} done={doneSet} today={today} legend />
          )}

          {(ev.skipsAllowed !== null || ev.maxMissesInRow !== null) && (
            <p className="text-muted-foreground -mt-4 text-[13px] text-pretty">
              The deal:{" "}
              {describeAllowance({
                skipsAllowed: ev.skipsAllowed,
                maxMissesInRow: ev.maxMissesInRow,
                cadence: view.cadence,
              }).toLowerCase()}
            </p>
          )}
        </section>

        {reactions.length > 0 && (
          <section className="border-border bg-card mt-12 flex flex-col gap-4 rounded-3xl border p-5 sm:p-6">
            <h2 className="text-xl tracking-[-0.025em]">Reactions</h2>
            <ReactionsFeed reactions={reactions} />
          </section>
        )}

        {rows.length > 0 && (
          <section className="mt-12 flex flex-col gap-3">
            <h2 className="text-xl tracking-[-0.025em]">Recent</h2>
            <ul className="border-border divide-border divide-y border-y">
              {rows.slice(0, 10).map((row) => (
                <li
                  key={row.date}
                  className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 py-3 text-sm"
                >
                  <span className="text-muted-foreground tabular-nums">
                    {row.date === today
                      ? "Today"
                      : row.date === addDays(today, -1)
                        ? "Yesterday"
                        : formatDay(row.date, { weekday: true })}
                  </span>
                  <span className="min-w-0">
                    {ev.mode === "each" ? (
                      <span className="tabular-nums">
                        {row.value}
                        <span className="text-muted-foreground">
                          {" "}
                          of {view.daily_target}
                          {view.target_unit ? ` ${view.target_unit}` : ""}
                        </span>
                      </span>
                    ) : ev.mode === "total" ? (
                      <span className="tabular-nums">
                        +{formatCount(row.value, view.target_unit)}
                      </span>
                    ) : (
                      <span className="text-success-ink">Kept</span>
                    )}
                    {row.note && (
                      <span className="text-muted-foreground mt-0.5 block text-pretty break-words">
                        {row.note}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Conversion: a watcher is the warmest possible lead, so the ask is
            tailored to exactly how far along they already are. On the ink
            band, like the landing page it leads to. */}
        {!isOwner && (
          <section className="band-ink mt-14 flex flex-col items-start gap-4 rounded-3xl px-6 py-10 sm:px-10 sm:py-12">
            {!isSignedIn ? (
              <>
                <h2 className="max-w-[16ch] text-[clamp(1.875rem,4.5vw,2.75rem)] leading-none tracking-[-0.045em] text-balance">
                  Want someone{" "}
                  <em className="text-ink-accent font-serif tracking-[-0.02em]">
                    watching
                  </em>{" "}
                  your streak?
                </h2>
                <p className="text-ink-muted max-w-md text-pretty">
                  Pick a habit, put something on the line, and send a link like
                  this one to a friend. It&apos;s free.
                </p>
                <Button size="xl" variant="inverse" className="mt-2" asChild>
                  <Link href={`/signup?next=/i/${token}`}>
                    Create a free account
                    <ArrowRight className="size-5" aria-hidden />
                  </Link>
                </Button>
              </>
            ) : !hasPassword ? (
              <>
                <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-none tracking-[-0.045em] text-balance">
                  Finish setting up your account
                </h2>
                <p className="text-ink-muted max-w-md text-pretty">
                  You&apos;re signed in with an emailed link. Add a password to
                  sign in instantly, then start a challenge of your own.
                </p>
                <Button size="xl" variant="inverse" className="mt-2" asChild>
                  <Link href={`/account/password?next=/i/${token}`}>
                    Set a password
                    <ArrowRight className="size-5" aria-hidden />
                  </Link>
                </Button>
              </>
            ) : !ownsAnyChallenge ? (
              <>
                <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-none tracking-[-0.045em] text-balance">
                  Your turn. Who&apos;s watching you?
                </h2>
                <p className="text-ink-muted max-w-md text-pretty">
                  You&apos;re holding {owner} accountable. Set your own
                  challenge and send them a link back.
                </p>
                <Button size="xl" variant="inverse" className="mt-2" asChild>
                  <Link href="/challenges/new">
                    Start your own challenge
                    <ArrowRight className="size-5" aria-hidden />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-2xl tracking-[-0.03em] text-balance">
                  Keep an eye on your own streak too
                </h2>
                <Button variant="inverse-outline" size="lg" asChild>
                  <Link href="/dashboard">
                    Go to my dashboard
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </>
            )}
          </section>
        )}

        <footer className="text-muted-foreground mt-10 text-center text-xs">
          Habitual. Habits stick when someone&apos;s watching.
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
          label={status === "due" ? `Nudge ${owner}` : `Cheer ${owner} on`}
        />
      )}
    </>
  );
}

/** A big number with its label above and a short unit beside it. */
function Figure({
  label,
  value,
  unit,
  tone,
  className,
}: {
  label: string;
  value: string;
  unit: string;
  tone?: "kept" | "warning";
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span className="text-muted-foreground text-[13px] capitalize">{label}</span>
      <span
        className={cn(
          "text-4xl leading-none tracking-[-0.045em] tabular-nums sm:text-5xl",
          tone === "kept" && "text-success-ink",
          tone === "warning" && "text-warning-ink",
        )}
      >
        {value}
      </span>
      {unit && <span className="text-muted-foreground text-[13px]">{unit}</span>}
    </div>
  );
}
