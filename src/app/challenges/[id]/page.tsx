import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Flame,
  HandCoins,
  HeartCrack,
  LifeBuoy,
  PartyPopper,
  Trophy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  cadenceLabel,
  describeAllowance,
  evaluateChallenge,
  formatCount,
  formatDay,
  periodNoun,
  schedulePeriods,
  todayISO,
  type Period,
} from "@/lib/challenges";
import { AppHeader } from "@/components/app-header";
import { CheckInForm } from "@/components/check-in-form";
import { ShareInvite } from "@/components/share-invite";
import { ReactionsFeed, type ReactionItem } from "@/components/reactions-feed";

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

  return (
    <>
      <AppHeader />

      <main
        id="main"
        className="mx-auto w-full max-w-5xl flex-1 px-5 py-6 sm:px-8 sm:py-10"
      >
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-sm text-sm transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Dashboard
        </Link>

        <div className="mt-6 flex flex-col gap-2">
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <CalendarDays className="size-3.5" aria-hidden />
            <span>
              {cadenceLabel(challenge.cadence, challenge.cadence_weekday)} ·{" "}
              {formatDay(challenge.start_date)}
              {challenge.end_date ? ` – ${formatDay(challenge.end_date)}` : ""}
            </span>
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            {challenge.title}
          </h1>
        </div>

        {/* The verdict, once there is one. */}
        {ev.status === "failed" && (
          <div className="text-destructive ring-destructive/25 bg-destructive/[0.06] mt-5 flex items-start gap-2.5 rounded-xl px-4 py-3">
            <HeartCrack className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="text-sm text-pretty">
              <span className="font-semibold">Challenge failed. </span>
              {ev.failReason === "in-a-row"
                ? `You missed ${ev.worstMissRun} ${
                    ev.worstMissRun === 1 ? noun.one : noun.many
                  } back to back.`
                : ev.failReason === "total"
                  ? `Time ran out ${formatCount(
                      ev.totalRemaining ?? 0,
                      challenge.target_unit,
                    )} short of ${formatCount(ev.totalTarget ?? 0)}.`
                  : `You used ${ev.missedPeriods} skips and only had ${ev.skipsAllowed}.`}{" "}
              {challenge.stake_text
                ? "Time to pay up — then start a fresh one."
                : "Start a fresh one; the streak was real while it lasted."}
            </p>
          </div>
        )}
        {ev.status === "won" && (
          <div className="text-success ring-success/25 bg-success/[0.06] mt-5 flex items-start gap-2.5 rounded-xl px-4 py-3">
            <PartyPopper className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="text-sm text-pretty">
              <span className="font-semibold">You made it. </span>
              {ev.mode === "total"
                ? `${formatCount(ev.totalLogged, challenge.target_unit)} logged — you cleared ${formatCount(ev.totalTarget ?? 0)}.`
                : `${ev.donePeriods} of ${ev.totalPeriods} check-ins, inside the rules you set.`}{" "}
              That&apos;s the whole game.
            </p>
          </div>
        )}
        {ev.status === "upcoming" && (
          <div className="text-muted-foreground ring-foreground/10 mt-5 flex items-start gap-2.5 rounded-xl px-4 py-3 ring-1">
            <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="text-sm text-pretty">
              Kicks off {formatDay(challenge.start_date, { weekday: true })}.
              Send your buddy the link in the meantime.
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          {/* ---------------- Main column ---------------- */}
          <div className="flex flex-col gap-8">
            {/* Streak hero — the payoff number */}
            <section aria-label="Progress" className="flex flex-col gap-3">
              <div className="ring-primary/15 from-primary/12 via-primary/5 relative overflow-hidden rounded-2xl bg-gradient-to-br to-transparent px-5 py-5 ring-1">
                <div className="flex items-center gap-4">
                  <span className="bg-primary/15 text-primary flex size-14 shrink-0 items-center justify-center rounded-2xl">
                    <Flame className="size-7" aria-hidden />
                  </span>
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-primary text-4xl leading-none font-bold tabular-nums">
                        {ev.streak}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {ev.streak === 1 ? noun.one : noun.many}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      current streak
                      {ev.bestStreak > 0 ? ` · best ${ev.bestStreak}` : ""}
                    </p>
                  </div>
                  {todayRow && (
                    <span className="text-success ring-success/20 bg-background/70 ml-auto inline-flex items-center gap-1 self-start rounded-full px-2.5 py-1 text-xs font-medium ring-1">
                      <CheckCircle2 className="size-3.5" aria-hidden />
                      Today
                    </span>
                  )}
                </div>
              </div>

              {ev.percent !== null && (
                <div className="ring-foreground/10 flex flex-col gap-2.5 rounded-2xl px-5 py-4 ring-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="text-primary size-4" aria-hidden />
                      <span className="text-sm font-semibold tabular-nums">
                        {ev.mode === "total"
                          ? `${formatCount(ev.totalLogged, challenge.target_unit)} of ${formatCount(ev.totalTarget ?? 0)}`
                          : `${ev.percent}% complete`}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {ev.mode === "total"
                        ? `${ev.percent}%`
                        : `${ev.donePeriods}/${ev.totalPeriods} check-ins`}
                      {ev.daysRemaining !== null
                        ? ` · ${ev.daysRemaining} days left`
                        : ""}
                    </span>
                  </div>
                  <div
                    className="bg-muted h-2.5 w-full overflow-hidden rounded-full"
                    role="progressbar"
                    aria-valuenow={ev.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Challenge completion"
                  >
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${ev.percent}%` }}
                    />
                  </div>
                  {/* Pace is the number that matters on a compounding goal —
                      a skipped day is fine as long as the total keeps up. */}
                  {ev.pace !== null && ev.status === "active" && (
                    <p className="text-xs">
                      {ev.pace >= 0 ? (
                        <span className="text-success font-medium">
                          {formatCount(ev.pace, challenge.target_unit)} ahead of
                          pace
                        </span>
                      ) : (
                        <span className="text-warning font-medium">
                          {formatCount(-ev.pace, challenge.target_unit)} behind
                          pace
                        </span>
                      )}
                      {ev.perCheckInToFinish !== null && (
                        <span className="text-muted-foreground">
                          {" "}
                          ·{" "}
                          {formatCount(
                            ev.perCheckInToFinish,
                            challenge.target_unit,
                          )}{" "}
                          per check-in to finish
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Don't-break-the-chain grid over every scheduled check-in */}
              {periods.length > 0 && (
                <ChainGrid periods={periods} done={doneSet} today={today} />
              )}
            </section>

            {/* Today's check-in (owner only) */}
            {isOwner && ev.status === "active" ? (
              <section className="flex flex-col gap-3">
                <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                  {todayRow ? "Today — logged ✓" : "Log today"}
                </h2>
                <div className="bg-card ring-foreground/10 rounded-2xl p-5 ring-1">
                  <CheckInForm
                    challengeId={challenge.id}
                    dailyTarget={challenge.daily_target}
                    totalTarget={challenge.total_target}
                    targetUnit={challenge.target_unit}
                    suggested={ev.perCheckInToFinish}
                    today={
                      todayRow
                        ? { value: todayRow.value, note: todayRow.note }
                        : null
                    }
                    streak={ev.streak}
                  />
                </div>
              </section>
            ) : isOwner ? null : (
              <section>
                <p className="text-muted-foreground text-sm text-pretty">
                  You&apos;re a buddy on this challenge. Open it from{" "}
                  <Link href="/dashboard" className="text-foreground underline">
                    your dashboard
                  </Link>{" "}
                  to cheer them on.
                </p>
              </section>
            )}

            {/* Recent activity */}
            {rows.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                  Recent
                </h2>
                <ul className="flex flex-col gap-2">
                  {rows.slice(0, 10).map((r) => (
                    <li
                      key={r.id}
                      className="ring-foreground/10 flex items-start gap-3 rounded-lg px-3 py-2 ring-1"
                    >
                      <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                        {formatDay(r.date)}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        {ev.mode === "each" ? (
                          <span className="text-sm font-medium tabular-nums">
                            {r.value}{" "}
                            <span className="text-muted-foreground font-normal">
                              / {challenge.daily_target}
                              {challenge.target_unit
                                ? ` ${challenge.target_unit}`
                                : ""}
                            </span>
                          </span>
                        ) : ev.mode === "total" ? (
                          <span className="text-sm font-medium tabular-nums">
                            +{formatCount(r.value, challenge.target_unit)}
                          </span>
                        ) : null}
                        {r.note ? (
                          <span className="text-muted-foreground text-sm text-pretty">
                            {r.note}
                          </span>
                        ) : (
                          ev.mode === "tick" && (
                            <span className="text-sm">Done ✓</span>
                          )
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* ---------------- Sidebar ---------------- */}
          <aside className="flex flex-col gap-6">
            {/* Wiggle room, as a running balance — the number that actually
                changes how today feels. */}
            {(ev.skipsAllowed !== null || ev.maxMissesInRow !== null) && (
              <div className="ring-foreground/10 flex flex-col gap-2 rounded-xl px-4 py-3 ring-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <LifeBuoy className="text-muted-foreground size-4" aria-hidden />
                    Wiggle room
                  </span>
                  {ev.skipsLeft !== null && (
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        ev.skipsLeft === 0 ? "text-warning" : "text-foreground"
                      }`}
                    >
                      {ev.skipsLeft} left
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs text-pretty">
                  {describeAllowance({
                    skipsAllowed: ev.skipsAllowed,
                    maxMissesInRow: ev.maxMissesInRow,
                    cadence: challenge.cadence,
                  })}{" "}
                  {ev.missedPeriods > 0 &&
                    `Missed ${ev.missedPeriods} so far.`}
                </p>
              </div>
            )}

            {challenge.stake_text && (
              <div className="bg-accent/60 text-accent-foreground flex items-start gap-2.5 rounded-xl px-4 py-3">
                <HandCoins className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p className="text-sm text-pretty">
                  <span className="font-medium">On the line: </span>
                  {challenge.stake_text}
                </p>
              </div>
            )}

            {isOwner && inviteToken && (
              <ShareInvite
                path={`/i/${inviteToken}`}
                baseUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
                title={challenge.title}
              />
            )}

            {reactions.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                  {isOwner ? "Your buddies say" : "Reactions"}
                </h2>
                <ReactionsFeed reactions={reactions} />
              </section>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}

/**
 * One cell per scheduled check-in: filled when logged, red once a slot has
 * elapsed unfilled, outlined for the one that's live right now, faint for
 * what's still ahead. Decorative — the same numbers are stated above in text.
 */
function ChainGrid({
  periods,
  done,
  today,
}: {
  periods: Period[];
  done: Set<string>;
  today: string;
}) {
  return (
    <div
      className="ring-foreground/10 grid grid-cols-10 gap-1.5 rounded-2xl px-5 py-4 ring-1 sm:grid-cols-15"
      aria-hidden
    >
      {periods.slice(0, 120).map((p) => {
        const filled = [...done].some(
          (d) => d >= p.start && d <= p.end,
        );
        const isPast = p.end < today;
        const isNow = p.start <= today && today <= p.end;
        return (
          <span
            key={p.start}
            title={p.start === p.end ? p.start : `${p.start} – ${p.end}`}
            className={
              filled
                ? "bg-primary aspect-square rounded-[4px]"
                : isPast
                  ? "bg-destructive/35 aspect-square rounded-[4px]"
                  : isNow
                    ? "ring-primary/60 aspect-square rounded-[4px] ring-2"
                    : "bg-muted-foreground/15 aspect-square rounded-[4px]"
            }
          />
        );
      })}
    </div>
  );
}
