"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { NAME_MAX, NICKNAME_MAX } from "@/lib/profile";

export type UpdateProfileState = { error?: string; ok?: boolean };

/**
 * Save the editable name fields. Email is deliberately NOT handled here — it
 * lives in auth, needs a confirmation round trip, and shouldn't be able to fail
 * a rename.
 *
 * Empty strings are stored as NULL so "unset" has exactly one representation
 * and the display-name fallback chain keeps working.
 */
export async function updateProfile(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const name = String(formData.get("name") ?? "").trim();
  const surname = String(formData.get("surname") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();

  if (name.length > NAME_MAX || surname.length > NAME_MAX) {
    return { error: `Names have to be ${NAME_MAX} characters or less.` };
  }
  if (nickname.length > NICKNAME_MAX) {
    return { error: `Nicknames have to be ${NICKNAME_MAX} characters or less.` };
  }

  const { error } = await supabase
    .from("users")
    .update({
      name: name || null,
      surname: surname || null,
      nickname: nickname || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  // The greeting and the header avatar both read these.
  revalidatePath("/account");
  revalidatePath("/dashboard");
  return { ok: true };
}

export type UpdateEmailState = { error?: string; sentTo?: string };

/**
 * Start an email change. Supabase emails a confirmation link (to the new
 * address, and to the old one too when "secure email change" is on); nothing
 * moves until it's clicked. `public.users.email` is brought back into step by
 * the `on_auth_user_email_changed` trigger once the change lands, so there's
 * nothing to write here.
 */
export async function updateEmail(
  _prev: UpdateEmailState,
  formData: FormData,
): Promise<UpdateEmailState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@") || email.length > 254) {
    return { error: "That doesn't look like an email address." };
  }
  if (email === user.email?.toLowerCase()) {
    return { error: "That's already your email address." };
  }

  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/account` },
  );

  if (error) return { error: error.message };

  return { sentTo: email };
}

/**
 * Absolute origin for emailed links. Prefers the configured site URL and falls
 * back to the request's own host, so localhost and preview deploys work without
 * configuration. Supabase only honours redirects on its allow-list either way.
 */
async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
