"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  todayISO,
  CADENCES,
  DURATIONS,
  type Cadence,
} from "@/lib/challenges";

export type CreateChallengeState = { error?: string };

const VALID_CADENCES = new Set<string>(CADENCES.map((c) => c.value));
const VALID_DURATIONS = new Set<number>(DURATIONS);

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
  const dailyTarget = Number(formData.get("daily_target") ?? 1);
  const duration = Number(formData.get("duration") ?? 30);
  const stakeText = String(formData.get("stake_text") ?? "").trim();

  if (title.length < 3) {
    return { error: "Give your challenge a title (at least 3 characters)." };
  }
  if (!VALID_CADENCES.has(cadence)) {
    return { error: "Pick a valid cadence." };
  }
  if (!Number.isFinite(dailyTarget) || dailyTarget < 1 || dailyTarget > 100000) {
    return { error: "Daily target must be a number of at least 1." };
  }
  if (!VALID_DURATIONS.has(duration)) {
    return { error: "Pick a valid duration." };
  }

  const startDate = todayISO();
  const endDate = addDays(startDate, duration - 1);

  const { data, error } = await supabase
    .from("challenges")
    .insert({
      owner_id: user.id,
      title,
      cadence,
      daily_target: Math.round(dailyTarget),
      start_date: startDate,
      end_date: endDate,
      stake_text: stakeText || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Couldn't create the challenge. Try again." };
  }

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
