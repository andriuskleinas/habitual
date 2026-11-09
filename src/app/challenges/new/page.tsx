import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/challenges";
import { AppHeader } from "@/components/app-header";
import { CreateChallengeForm } from "@/components/create-challenge-form";

export const metadata: Metadata = { title: "New challenge" };

export default async function NewChallengePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/challenges/new");

  const { data: profile } = await supabase
    .from("users")
    .select("name, surname, nickname, email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <AppHeader profile={profile ?? { email: user.email }} />

      <main
        id="main"
        className="mx-auto w-full max-w-xl flex-1 px-5 py-6 sm:px-8 sm:py-10"
      >
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-sm text-sm transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Dashboard
        </Link>

        <div className="mt-6 flex flex-col gap-1.5">
          <h1 className="text-[clamp(2.25rem,5vw,3.25rem)] leading-none tracking-[-0.045em] text-balance">
            New challenge
          </h1>
          <p className="text-muted-foreground text-pretty">
            Pick something small enough to do on a bad day. Then let someone
            watch you do it.
          </p>
        </div>

        <div className="bg-card border-border mt-8 rounded-3xl border p-5 sm:p-7">
          <CreateChallengeForm today={todayISO()} />
        </div>

        <p className="text-muted-foreground mt-6 flex items-start gap-2 text-sm text-pretty">
          <Users className="mt-0.5 size-4 shrink-0" aria-hidden />
          Next up: a link to send your buddy. They can watch — and heckle —
          without signing up.
        </p>
      </main>
    </>
  );
}
