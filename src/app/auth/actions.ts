"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Same sign-out, but for the idle-timeout watcher rather than a manual click —
 * lands back on /login with a reason to show and, once sanitised, the page the
 * user was on so a fresh sign-in returns them there.
 */
export async function signOutForInactivity(next?: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const params = new URLSearchParams({ reason: "inactivity" });
  if (next) params.set("next", safeNext(next));
  redirect(`/login?${params.toString()}`);
}
