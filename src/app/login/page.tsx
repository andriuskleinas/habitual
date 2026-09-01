import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isInviteNext, safeNext } from "@/lib/auth";
import { BUDDY_REACTIONS, parsePendingReaction } from "@/lib/reactions";
import { LoginForm } from "@/components/login-form";
import { AuthHeader } from "@/components/auth-header";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Habitual with a password or a magic link. Start a challenge and invite a buddy to keep you accountable.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reason?: string }>;
}) {
  // Read on the server and passed down: `useSearchParams` inside the form made
  // the whole page bail out to client-side rendering, so the sign-in form was
  // absent from the HTML until hydration.
  const { next, error, reason } = await searchParams;
  const target = safeNext(next);

  // A buddy who tapped "Cheer" on an invite arrives with their choice in tow
  // (`/i/<token>?r=cheer`). Naming it here keeps the sign-in step feeling like
  // the last step of something they started, not a gate in front of it.
  const fromInvite = isInviteNext(target);
  const pending = fromInvite
    ? parsePendingReaction(
        new URLSearchParams(target.split("?")[1] ?? "").get("r") ?? undefined,
      )
    : null;
  const pendingEmoji =
    BUDDY_REACTIONS.find((r) => r.type === pending)?.emoji ?? null;

  return (
    <>
      <AuthHeader />

      <main
        id="main"
        className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8"
      >
        <div className="w-full max-w-sm">
          <div className="bg-card ring-foreground/10 rounded-2xl p-6 shadow-sm ring-1 sm:p-8">
            <LoginForm
              next={target}
              hadLinkError={!!error}
              signedOutForInactivity={reason === "inactivity"}
              fromInvite={fromInvite}
              pendingEmoji={pendingEmoji}
            />
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
