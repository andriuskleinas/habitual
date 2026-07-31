import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { SetPasswordForm } from "@/components/set-password-form";

export const metadata: Metadata = {
  title: "Password",
  robots: { index: false, follow: false },
};

export default async function PasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/password");

  const { data: profile } = await supabase
    .from("users")
    .select("name, surname, nickname, email, password_set_at")
    .eq("id", user.id)
    .maybeSingle();

  const isFirstTime = !profile?.password_set_at;
  const target = safeNext(next);

  return (
    <>
      <AppHeader profile={profile ?? { email: user.email }} />

      <main
        id="main"
        className="mx-auto w-full max-w-xl flex-1 px-5 py-6 sm:px-8 sm:py-10"
      >
        <Link
          href={target}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-sm text-sm transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>

        <div className="mt-6 flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isFirstTime ? "Finish your account" : "Change your password"}
          </h1>
          <p className="text-muted-foreground text-pretty">
            {isFirstTime
              ? "You've been signing in with emailed links. Add a password and you can sign in instantly from any device."
              : "Pick a new password. You'll stay signed in on this device."}
          </p>
        </div>

        <div className="bg-card ring-foreground/10 mt-8 rounded-2xl p-5 ring-1 sm:p-6">
          <SetPasswordForm isFirstTime={isFirstTime} next={target} />
        </div>

        <p className="text-muted-foreground mt-6 flex items-start gap-2 text-sm text-pretty">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          Magic links keep working either way — a password is just a faster way
          in. Signed in as {user.email}.
        </p>
      </main>
    </>
  );
}
