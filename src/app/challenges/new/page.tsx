import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreateChallengeForm } from "@/components/create-challenge-form";

export const metadata: Metadata = { title: "New challenge" };

export default async function NewChallengePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/challenges/new");

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <header>
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
      </header>

      <section className="mt-8 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">New challenge</h1>
        <p className="text-muted-foreground text-pretty">
          Commit to something daily. You&apos;ll invite a buddy to watch next.
        </p>
      </section>

      <section className="mt-8">
        <CreateChallengeForm />
      </section>
    </main>
  );
}
