import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";
import { SignupForm } from "@/components/signup-form";
import { AuthHeader } from "@/components/auth-header";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Create a free Habitual account, set a daily challenge, and invite a buddy to keep you accountable.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already signed in (typically a magic-link buddy who tapped "create
  // account"). `signUp` would silently no-op on their existing email, so send
  // them to the flow that actually works: setting a password.
  const target = safeNext(next);

  if (user) {
    redirect(`/account/password?next=${encodeURIComponent(target)}`);
  }

  return (
    <>
      <AuthHeader />

      <main
        id="main"
        className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8"
      >
        <div className="w-full max-w-sm">
          <div className="bg-card ring-foreground/10 rounded-2xl p-6 shadow-sm ring-1 sm:p-8">
            <SignupForm next={target} />
          </div>

          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-sm text-sm transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to home
          </Link>
        </div>
      </main>
    </>
  );
}
