"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  cadenceNeedsWeekday,
  resolveStartDate,
  schedulePeriods,
  todayISO,
  CADENCES,
  DURATIONS,
  START_OPTIONS,
  type AllowanceMode,
  type Cadence,
} from "@/lib/challenges";

export type CreateChallengeState = { error?: string };

const VALID_CADENCES = new Set<string>(CADENCES.map((c) => c.value));
const VALID_DURATIONS = new Set<number>(DURATIONS.map((d) => d.days));
const VALID_STARTS = new Set<string>(START_OPTIONS.map((s) => s.value));

export async function createChallenge(
  _prev: CreateChallengeState,
  formData: FormData,
): Promise<CreateChallengeState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const cadence = String(formData.get("cadence") ?? "daily") as Cadence;
  const goalMode = String(formData.get("goal_mode") ?? "tick");
  const targetUnit = String(formData.get("target_unit") ?? "").trim();
  const startWhen = String(formData.get("start_when") ?? "today");
  const duration = Number(formData.get("duration") ?? 28);
  const stakeText = String(formData.get("stake_text") ?? "").trim();

  if (title.length < 3) {
    return { error: "Give your challenge a title (at least 3 characters)." };
  }
  if (!VALID_CADENCES.has(cadence)) {
    return { error: "Pick a valid cadence." };
  }

  // Goal shape: a plain tick, a per-check-in number, or a cumulative total.
  // Only one number field is submitted, so the mode decides which to read.
  let dailyTarget = 1;
  let totalTarget: number | null = null;
  if (goalMode === "each") {
    dailyTarget = Number(formData.get("daily_target") ?? 1);
    if (!Number.isFinite(dailyTarget) || dailyTarget < 1 || dailyTarget > 100000) {
      return { error: "The per-check-in target must be a number of at least 1." };
    }
    dailyTarget = Math.round(dailyTarget);
  } else if (goalMode === "total") {
    totalTarget = Number(formData.get("total_target") ?? 0);
    if (!Number.isFinite(totalTarget) || totalTarget < 1 || totalTarget > 10_000_000) {
      return { error: "The total to reach must be a number of at least 1." };
    }
    totalTarget = Math.round(totalTarget);
  } else if (goalMode !== "tick") {
    return { error: "Pick how you'll measure it." };
  }

  if (targetUnit.length > 24) {
    return { error: "Keep the unit short — 24 characters or less." };
  }
  if (stakeText.length < 3) {
    return {
      error: "Put something on the line — that's what makes this work.",
    };
  }
  if (!VALID_STARTS.has(startWhen)) {
    return { error: "Pick a valid start day." };
  }
  if (!VALID_DURATIONS.has(duration)) {
    return { error: "Pick a valid duration." };
  }

  // A weekday only travels with the "every <weekday>" cadence; the column has a
  // CHECK constraint saying as much, so drop it for every other cadence.
  let cadenceWeekday: number | null = null;
  if (cadenceNeedsWeekday(cadence)) {
    cadenceWeekday = Number(formData.get("cadence_weekday") ?? 1);
    if (!Number.isInteger(cadenceWeekday) || cadenceWeekday < 0 || cadenceWeekday > 6) {
      return { error: "Pick which day of the week." };
    }
  }

  // Wiggle room: "none" means unlimited skips, stored as a null mode + value.
  const rawMode = String(formData.get("allowance_mode") ?? "count");
  let allowanceMode: AllowanceMode | null = null;
  let allowanceValue: number | null = null;
  if (rawMode === "count" || rawMode === "percent") {
    allowanceMode = rawMode;
    allowanceValue = Number(formData.get("allowance_value") ?? 0);
    const max = rawMode === "percent" ? 50 : 365;
    if (!Number.isFinite(allowanceValue) || allowanceValue < 0 || allowanceValue > max) {
      return {
        error:
          rawMode === "percent"
            ? "Skips have to be between 0% and 50%."
            : "Skips have to be between 0 and 365.",
      };
    }
    allowanceValue = Math.round(allowanceValue);
  } else if (rawMode !== "none") {
    return { error: "Pick how skips are counted." };
  }

  const rawInARow = String(formData.get("max_misses_in_row") ?? "");
  let maxMissesInRow: number | null = null;
  if (rawInARow !== "") {
    maxMissesInRow = Number(rawInARow);
    if (!Number.isInteger(maxMissesInRow) || maxMissesInRow < 1 || maxMissesInRow > 10) {
      return { error: "Pick a valid back-to-back rule." };
    }
  }

  const startDate = resolveStartDate(startWhen, todayISO());
  const endDate = addDays(startDate, duration - 1);

  // Guard the combination the individual fields can't catch: e.g. "once a
  // month" over a single week never comes round to a first check-in.
  const periods = schedulePeriods({ cadence, cadenceWeekday, startDate, endDate });
  if (periods.length === 0) {
    return {
      error: "That window is too short for a single check-in. Make it longer, or check in more often.",
    };
  }

  const { data, error } = await supabase
    .from("challenges")
    .insert({
      owner_id: user.id,
      title,
      cadence,
      cadence_weekday: cadenceWeekday,
      daily_target: dailyTarget,
      total_target: totalTarget,
      target_unit: goalMode !== "tick" && targetUnit ? targetUnit : null,
      start_date: startDate,
      end_date: endDate,
      allowance_mode: allowanceMode,
      allowance_value: allowanceValue,
      max_misses_in_row: maxMissesInRow,
      stake_text: stakeText,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Couldn't create the challenge. Try again." };
  }

  // Every challenge ships with a shareable invite from birth: one pending
  // buddies row whose invite_token (auto-generated) is the sharable link.
  // A failure here shouldn't block the create — the detail page can heal a
  // missing invite later — so we don't surface the error.
  await supabase.from("buddies").insert({ challenge_id: data.id, status: "pending" });

  revalidatePath("/dashboard");
  redirect(`/challenges/${data.id}`);
}

export type LogCheckInState = { error?: string; ok?: boolean };

export async function logCheckIn(
  _prev: LogCheckInState,
  formData: FormData,
): Promise<LogCheckInState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const challengeId = String(formData.get("challenge_id") ?? "");
  const value = Number(formData.get("value") ?? 1);
  const note = String(formData.get("note") ?? "").trim();

  if (!challengeId) {
    return { error: "Missing challenge." };
  }
  if (!Number.isFinite(value) || value < 0 || value > 100000) {
    return { error: "Enter a valid amount." };
  }

  const date = todayISO();

  // One check-in per challenge per day: upsert on the (challenge_id, date)
  // unique constraint so a re-log updates today's entry rather than erroring.
  const { error } = await supabase.from("check_ins").upsert(
    {
      challenge_id: challengeId,
      user_id: user.id,
      date,
      value: Math.round(value),
      note: note || null,
    },
    { onConflict: "challenge_id,date" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
