import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isInviteNext, safeNext } from "@/lib/auth";
import { Wordmark } from "@/components/brand";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Habitual with a password or a magic link. Start a challenge and invite a buddy to keep you accountable.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  // Read on the server and passed down: `useSearchParams` inside the form made
  // the whole page bail out to client-side rendering, so the sign-in form was
  // absent from the HTML until hydration.
  const { next, error } = await searchParams;
  const target = safeNext(next);

  return (
    <>
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Wordmark />
        <ThemeToggle />
      </header>

      <main
        id="main"
        className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8"
      >
        <div className="w-full max-w-sm">
          <div className="bg-card ring-foreground/10 rounded-2xl p-6 shadow-sm ring-1 sm:p-8">
            <LoginForm
              next={target}
              hadLinkError={!!error}
              fromInvite={isInviteNext(target)}
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
