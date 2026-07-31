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

  return (
    <>
      <AppHeader showNew={false} />

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
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            New challenge
          </h1>
          <p className="text-muted-foreground text-pretty">
            Pick something small enough to do on a bad day. Then let someone
            watch you do it.
          </p>
        </div>

        <div className="bg-card ring-foreground/10 mt-8 rounded-2xl p-5 ring-1 sm:p-6">
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
