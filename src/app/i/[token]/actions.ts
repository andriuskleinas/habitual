"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Reactions a buddy can send from the invite view. `reward` is owner→buddy
 * (later). Not exported — a "use server" file may only export async functions.
 */
const BUDDY_REACTIONS = ["cheer", "nudge", "note"] as const;
export type BuddyReaction = (typeof BUDDY_REACTIONS)[number];
const VALID = new Set<string>(BUDDY_REACTIONS);

export type ClaimResult = {
  result: "claimed" | "already" | "owner" | "not_found" | "unauthenticated";
  challenge_id?: string;
};

/**
 * Claim a buddy invite for the signed-in user (fills `buddy_user_id`).
 * Idempotent and safe to call during render — it does NOT revalidate.
 */
export async function claimInvite(token: string): Promise<ClaimResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { result: "unauthenticated" };

  const { data } = await supabase.rpc("claim_invite", { p_token: token });
  return (data as ClaimResult | null) ?? { result: "not_found" };
}

export type SendReactionState = { error?: string; ok?: boolean };

/**
 * A buddy cheers / nudges / notes on a challenge. We claim first (idempotent)
 * so the RLS insert check (must be a claimed buddy) is guaranteed to pass, then
 * insert the reaction. `from_user_id` is enforced = auth.uid() by RLS.
 */
export async function sendReaction(
  _prev: SendReactionState,
  formData: FormData,
): Promise<SendReactionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to react." };

  const token = String(formData.get("token") ?? "");
  const type = String(formData.get("type") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!VALID.has(type)) return { error: "Unknown reaction." };
  if (type === "note" && message.length === 0) {
    return { error: "Write a note first." };
  }
  if (message.length > 500) {
    return { error: "Keep it under 500 characters." };
  }

  const { data: claim } = await supabase.rpc("claim_invite", { p_token: token });
  const claimResult = claim as ClaimResult | null;
  const challengeId = claimResult?.challenge_id;

  if (claimResult?.result === "owner") {
    return { error: "This is your own challenge." };
  }
  if (!challengeId) {
    return { error: "This invite link is no longer valid." };
  }

  const { error } = await supabase.from("reactions").insert({
    challenge_id: challengeId,
    from_user_id: user.id,
    type,
    message: message || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/i/${token}`);
  return { ok: true };
}
