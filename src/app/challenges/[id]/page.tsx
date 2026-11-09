import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  cadenceLabel,
  describeAllowance,
  diffDays,
  evaluateChallenge,
  formatCount,
  formatDay,
  periodNoun,
  schedulePeriods,
  todayISO,
} from "@/lib/challenges";
import { AppHeader } from "@/components/app-header";
import { ChainGrid } from "@/components/chain-grid";
import { CheckInForm } from "@/components/check-in-form";
import { TodayDone } from "@/components/today-done";
import { ShareInvite } from "@/components/share-invite";
import { ReactionsFeed, type ReactionItem } from "@/components/reactions-feed";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Challenge" };

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

  const { data: profile } = await supabase
    .from("users")
    .select("name, surname, nickname, email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: challenge } = await supabase
    .from("challenges")
    .select(
      "id, owner_id, title, cadence, cadence_weekday, daily_target, total_target, target_unit, start_date, end_date, allowance_mode, allowance_value, max_misses_in_row, stake_text",
    )
    .eq("id", id)
    .maybeSingle();

  if (!challenge) notFound();

  const { data: checkIns } = await supabase
    .from("check_ins")
    .select("id, date, value, note")
    .eq("challenge_id", id)
    .order("date", { ascending: false });

  // Buddy reactions with author names (owner/claimed-buddy only; the RPC gates
  // access and returns null otherwise — direct RLS can't read others' names).
  const { data: reactionsData } = await supabase.rpc("reactions_for_challenge", {
    p_challenge_id: id,
  });
  const reactions = (reactionsData as ReactionItem[] | null) ?? [];

  const isOwner = challenge.owner_id === user.id;

  // The shareable invite link lives on a buddies row (owner-readable via RLS).
  let inviteToken: string | null = null;
  if (isOwner) {
    const { data: invite } = await supabase
      .from("buddies")
      .select("invite_token")
      .eq("challenge_id", id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    inviteToken = invite?.invite_token ?? null;
  }

  const rows = checkIns ?? [];
  const dates = rows.map((r) => r.date);
  const today = todayISO();

  const rules = {
    cadence: challenge.cadence,
    cadenceWeekday: challenge.cadence_weekday,
    startDate: challenge.start_date,
    endDate: challenge.end_date,
    allowanceMode: challenge.allowance_mode,
    allowanceValue: challenge.allowance_value,
    maxMissesInRow: challenge.max_misses_in_row,
    dailyTarget: challenge.daily_target,
    totalTarget: challenge.total_target,
  };
  const ev = evaluateChallenge(rules, rows, today);
  const noun = periodNoun(challenge.cadence);
  const periods = schedulePeriods({ ...rules, today });
  const todayRow = rows.find((r) => r.date === today) ?? null;
  const doneSet = new Set(dates);
  // The next slot that opens after today — what the "done" card points at.
  const nextPeriod = periods.find((p) => p.start > today) ?? null;

  const dayOf =
    ev.status === "active" && challenge.end_date
      ? `day ${diffDays(challenge.start_date, today) + 1} of ${diffDays(challenge.start_date, challenge.end_date) + 1}`
      : null;

  return (
    <>
      <AppHeader profile={profile ?? { email: user.email }} />

      <main
        id="main"
        className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-12"
      >
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-sm text-sm transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Dashboard
        </Link>

        <header className="mt-8">
          <p className="text-muted-foreground text-sm">
            {[
              cadenceLabel(challenge.cadence, challenge.cadence_weekday),
              `${formatDay(challenge.start_date)}${challenge.end_date ? ` – ${formatDay(challenge.end_date)}` : ""}`,
              dayOf,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <h1 className="mt-3 text-[clamp(2.25rem,5.5vw,4rem)] leading-[0.98] tracking-[-0.05em] text-balance break-words">
            {challenge.title}
          </h1>
        </header>

        {/* The stake is the reason any of this works, so it gets the loudest
            slot on the page: full width, directly under the title, above the
            fold on a phone. Set as a quote, because it's a promise in the
            owner's own words. */}
        {challenge.stake_text && (
          <section
            aria-label="What's on the line"
            className="border-border mt-8 grid gap-2 border-y py-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-baseline sm:gap-6"
          >
            <p className="text-cheer-ink text-xs font-medium tracking-[0.1em] uppercase">
              On the line
            </p>
            <p className="font-serif text-[clamp(1.5rem,3.2vw,2.125rem)] leading-[1.1] text-pretty break-words italic">
              {challenge.stake_text}
            </p>
          </section>
        )}

        {/* The verdict, once there is one. */}
        {ev.status === "failed" && (
          <Notice tone="failed" title="Challenge failed.">
            {ev.failReason === "in-a-row"
              ? `You missed ${ev.worstMissRun} ${
                  ev.worstMissRun === 1 ? noun.one : noun.many
                } back to back.`
              : ev.failReason === "total"
                ? `Time ran out ${formatCount(
                    ev.totalRemaining ?? 0,
                    challenge.target_unit,
                  )} short of ${formatCount(ev.totalTarget ?? 0)}.`
                : `You used ${ev.missedPeriods} skips and had ${ev.skipsAllowed}.`}{" "}
            {challenge.stake_text
              ? "Time to pay up, then start a fresh one."
              : "Start a fresh one. The streak was real while it lasted."}
          </Notice>
        )}
        {ev.status === "won" && (
          <Notice tone="won" title="You made it.">
            {ev.mode === "total"
              ? `${formatCount(ev.totalLogged, challenge.target_unit)} logged, past your ${formatCount(ev.totalTarget ?? 0)}.`
              : `${ev.donePeriods} of ${ev.totalPeriods} check-ins, inside the rules you set.`}
          </Notice>
        )}
        {ev.status === "upcoming" && (
          <Notice tone="neutral" title={`Starts ${formatDay(challenge.start_date, { weekday: true })}.`}>
            Send your buddy the link in the meantime.
          </Notice>
        )}

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-12">
          {/* ---------------- Main column ---------------- */}
          <div className="flex min-w-0 flex-col gap-10">
            <section aria-label="Progress" className="flex flex-col gap-8">
              {/* Three numbers in a row, the streak loudest and green: it's the
                  one you're protecting. */}
              <div className="grid grid-cols-3">
                <Figure
                  label="Current streak"
                  value={ev.streak}
                  unit={noun.one}
                  tone="kept"
                />
                <Figure
                  label="Best"
                  value={ev.bestStreak}
                  unit={noun.one}
                  className="border-border border-l pl-4 sm:pl-6"
                />
                <div className="border-border flex min-w-0 flex-col gap-2 border-l pl-4 sm:pl-6">
                  <span className="text-muted-foreground text-[13px]">
                    {ev.mode === "total" ? "Total" : "Progress"}
                  </span>
                  <span className="text-4xl leading-none tracking-[-0.045em] tabular-nums sm:text-6xl">
                    {ev.percent ?? 0}
                    <span className="text-muted-foreground ml-1 text-sm tracking-normal">
                      %
                    </span>
                  </span>
                  {ev.percent !== null && (
                    <div
                      className="bg-muted mt-1 h-1.5 w-full overflow-hidden rounded-full"
                      role="progressbar"
                      aria-valuenow={ev.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Challenge completion"
                    >
                      <div
                        className="bg-success h-full rounded-full"
                        style={{ width: `${ev.percent}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <p className="text-muted-foreground -mt-2 text-sm text-pretty">
                {ev.mode === "total"
                  ? `${formatCount(ev.totalLogged, challenge.target_unit)} of ${formatCount(ev.totalTarget ?? 0)}`
                  : ev.totalPeriods !== null
                    ? `${ev.donePeriods} of ${ev.totalPeriods} check-ins`
                    : `${ev.donePeriods} check-ins`}
                {ev.daysRemaining !== null && ev.status === "active"
                  ? ` · ${ev.daysRemaining} day${ev.daysRemaining === 1 ? "" : "s"} left`
                  : ""}
                {/* Pace is the number that matters on a compounding goal: a
                    skipped day is fine as long as the total keeps up. */}
                {ev.pace !== null && ev.status === "active" && (
                  <>
                    {" · "}
                    {ev.pace >= 0 ? (
                      <span className="text-success-ink font-medium">
                        {formatCount(ev.pace, challenge.target_unit)} ahead of pace
                      </span>
                    ) : (
                      <span className="text-warning-ink font-medium">
                        {formatCount(-ev.pace, challenge.target_unit)} behind pace
                      </span>
                    )}
                    {ev.perCheckInToFinish !== null &&
                      ` · ${formatCount(ev.perCheckInToFinish, challenge.target_unit)} per check-in to finish`}
                  </>
                )}
              </p>

              {periods.length > 0 && (
                <ChainGrid periods={periods} done={doneSet} today={today} legend />
              )}
            </section>

            {/* Today's check-in (owner only). One per day: once it's logged the
                form is gone for good, replaced by the receipt. */}
            {isOwner && ev.status === "active" ? (
              <section className="flex flex-col gap-4">
                <h2 className="text-xl tracking-[-0.025em]">
                  {todayRow ? "Today" : "Log today"}
                </h2>
                {todayRow ? (
                  <TodayDone
                    challengeId={challenge.id}
                    date={today}
                    streak={ev.streak}
                    streakNoun={ev.streak === 1 ? noun.one : noun.many}
                    value={todayRow.value}
                    note={todayRow.note}
                    showValue={ev.mode !== "tick"}
                    unit={challenge.target_unit}
                    nextDue={
                      nextPeriod
                        ? formatDay(nextPeriod.start, { weekday: true })
                        : null
                    }
                  />
                ) : (
                  <div className="bg-muted/60 rounded-3xl p-5 sm:p-6">
                    <CheckInForm
                      challengeId={challenge.id}
                      dailyTarget={challenge.daily_target}
                      totalTarget={challenge.total_target}
                      targetUnit={challenge.target_unit}
                      suggested={ev.perCheckInToFinish}
                      today={today}
                    />
                  </div>
                )}
              </section>
            ) : isOwner ? null : (
              <p className="text-muted-foreground text-sm text-pretty">
                You&apos;re a buddy on this challenge. Open it from{" "}
                <Link href="/dashboard" className="text-foreground underline">
                  your dashboard
                </Link>{" "}
                to cheer them on.
              </p>
            )}

            {rows.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-xl tracking-[-0.025em]">Recent</h2>
                <ul className="border-border divide-border divide-y border-y">
                  {rows.slice(0, 10).map((r) => (
                    <li
                      key={r.id}
                      className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-3 text-sm"
                    >
                      <span className="text-muted-foreground tabular-nums">
                        {formatDay(r.date, { weekday: true })}
                      </span>
                      <span className="min-w-0">
                        {ev.mode === "each" ? (
                          <span className="tabular-nums">
                            {r.value}
                            <span className="text-muted-foreground">
                              {" "}
                              of {challenge.daily_target}
                              {challenge.target_unit
                                ? ` ${challenge.target_unit}`
                                : ""}
                            </span>
                          </span>
                        ) : ev.mode === "total" ? (
                          <span className="tabular-nums">
                            +{formatCount(r.value, challenge.target_unit)}
                          </span>
                        ) : (
                          <span className="text-success-ink">Kept</span>
                        )}
                        {r.note && (
                          <span className="text-muted-foreground mt-0.5 block text-pretty break-words">
                            {r.note}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* ---------------- Sidebar ---------------- */}
          <aside className="flex min-w-0 flex-col gap-5">
            {isOwner && inviteToken && (
              <ShareInvite
                path={`/i/${inviteToken}`}
                baseUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
                title={challenge.title}
              />
            )}

            {reactions.length > 0 && (
              <section className="border-border bg-card flex flex-col gap-4 rounded-3xl border p-5">
                <h2 className="text-lg tracking-[-0.02em]">
                  {isOwner ? "From your buddies" : "Reactions"}
                </h2>
                <ReactionsFeed reactions={reactions} />
              </section>
            )}

            {/* The rules you set, as a running balance. Kept quiet and last on
                purpose: it's reference material, and dressing a skip budget up
                as a headline just advertises the way out. */}
            {(ev.skipsAllowed !== null || ev.maxMissesInRow !== null) && (
              <p className="text-muted-foreground px-1 text-[13px] text-pretty">
                <span className="text-foreground/80 font-medium">Wiggle room:</span>{" "}
                {ev.skipsLeft !== null && (
                  <>
                    <span
                      className={
                        ev.skipsLeft === 0
                          ? "text-warning-ink font-medium tabular-nums"
                          : "tabular-nums"
                      }
                    >
                      {ev.skipsLeft} left
                    </span>
                    {" · "}
                  </>
                )}
                {describeAllowance({
                  skipsAllowed: ev.skipsAllowed,
                  maxMissesInRow: ev.maxMissesInRow,
                  cadence: challenge.cadence,
                })}{" "}
                {ev.missedPeriods > 0 && `Missed ${ev.missedPeriods} so far.`}
              </p>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}

/** A big number with its label above and unit beside it. */
function Figure({
  label,
  value,
  unit,
  tone,
  className,
}: {
  label: string;
  value: number;
  unit: string;
  tone?: "kept";
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span className="text-muted-foreground text-[13px]">{label}</span>
      <span
        className={cn(
          "text-4xl leading-none tracking-[-0.045em] tabular-nums sm:text-6xl",
          tone === "kept" && "text-success-ink",
        )}
      >
        {value}
        <span className="text-muted-foreground ml-1.5 text-sm tracking-normal">
          {unit}
          {value === 1 ? "" : "s"}
        </span>
      </span>
    </div>
  );
}

/** The verdict line: won, failed or not yet started. Text only, no box. */
function Notice({
  tone,
  title,
  children,
}: {
  tone: "won" | "failed" | "neutral";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "bg-muted/60 mt-6 rounded-2xl px-5 py-4 text-pretty",
        tone === "failed" && "text-destructive",
      )}
    >
      <span
        className={cn(
          "font-medium",
          tone === "won" && "text-success-ink",
        )}
      >
        {title}
      </span>{" "}
      <span className={tone === "failed" ? "" : "text-muted-foreground"}>
        {children}
      </span>
    </p>
  );
}
