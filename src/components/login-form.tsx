"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, Mail, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";

type Mode = "password" | "magic";

/**
 * `next` and `hadLinkError` are read on the SERVER and passed in, rather than
 * via `useSearchParams`. Calling that hook here made the whole form bail out to
 * client-side rendering, so the sign-in page shipped an empty box and only
 * painted the form once JS had hydrated.
 */
export function LoginForm({
  next,
  hadLinkError = false,
  fromInvite = false,
  pendingEmoji = null,
}: {
  /** Already sanitised by `safeNext` on the server. */
  next: string;
  /** True when redirected here after a failed magic-link exchange. */
  hadLinkError?: boolean;
  /** Arrived from a buddy invite — almost certainly a first-time visitor. */
  fromInvite?: boolean;
  /** Emoji of the reaction they picked before signing in, if any. */
  pendingEmoji?: string | null;
}) {
  const router = useRouter();

  // A buddy following an invite has no account yet, so lead with the magic
  // link; the password tab is still one tap away for anyone who does.
  const [mode, setMode] = useState<Mode>(fromInvite ? "magic" : "password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(
    hadLinkError ? "That sign-in link didn't work. Try again." : null,
  );

  async function signInWithPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus("idle");
      // Supabase returns a deliberately vague message for both a wrong
      // password and an unknown email; keep it vague but actionable.
      setError(
        error.message === "Invalid login credentials"
          ? "That email and password don't match. Check them, or use a magic link instead."
          : error.message,
      );
      return;
    }

    // Server Components read auth from cookies, so refresh before navigating.
    router.refresh();
    router.push(next);
  }

  async function sendMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setStatus("idle");
      setError(error.message);
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="bg-success/10 text-success flex size-14 items-center justify-center rounded-2xl">
          <MailCheck className="size-7" aria-hidden />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
          <p className="text-muted-foreground text-pretty">
            We sent a magic link to{" "}
            <span className="text-foreground font-medium break-all">{email}</span>
            . Tap it on this device to sign in.
          </p>
        </div>
        <p className="text-muted-foreground text-sm">
          Nothing yet? Check your spam folder — it arrives within a minute.
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            setStatus("idle");
            setEmail("");
          }}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Use a different email
        </Button>
      </div>
    );
  }

  const busy = status === "sending";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1.5 text-center">
        {/* Their reaction, held. Seeing the thing they already picked waiting
            on the sign-in screen is what makes this feel like one step left
            rather than a toll gate. */}
        {pendingEmoji && (
          <span
            className="bg-primary/10 mb-1 flex size-14 items-center justify-center rounded-2xl text-3xl"
            aria-hidden
          >
            {pendingEmoji}
          </span>
        )}
        {/* "Welcome back" is wrong for a first-time buddy following an invite. */}
        <h1 className="text-2xl font-bold tracking-tight">
          {pendingEmoji
            ? "One step and it's sent"
            : fromInvite
              ? "Sign in to cheer"
              : "Welcome back"}
        </h1>
        <p className="text-muted-foreground text-pretty">
          {pendingEmoji
            ? "We'll deliver your reaction the second you're in. A magic link is the quickest way — no password to make up."
            : fromInvite
              ? "No account needed to watch — just to cheer them on. A magic link is the quickest way in."
              : "Sign in to keep your streak going."}
        </p>
      </div>

      {/* Mode switch — password first, magic link still one tap away. */}
      <div
        role="tablist"
        aria-label="Sign-in method"
        className="bg-muted flex gap-1 rounded-lg p-1"
      >
        {(
          [
            ["password", "Password", KeyRound],
            ["magic", "Magic link", Mail],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => {
              setMode(value);
              setError(null);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <form
        onSubmit={mode === "password" ? signInWithPassword : sendMagicLink}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            disabled={busy}
          />
        </div>

        {mode === "password" && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-muted-foreground hover:text-foreground rounded-sm text-xs underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              placeholder="Your password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
              disabled={busy}
            />
          </div>
        )}

        {mode === "magic" && (
          <p className="text-muted-foreground text-sm text-pretty">
            We&apos;ll email you a link that signs you in — no password needed.
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={
            busy ||
            email.length === 0 ||
            (mode === "password" && password.length === 0)
          }
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : mode === "password" ? (
            <KeyRound className="size-4" aria-hidden />
          ) : (
            <Mail className="size-4" aria-hidden />
          )}
          {busy
            ? mode === "password"
              ? "Signing in…"
              : "Sending link…"
            : mode === "password"
              ? "Sign in"
              : "Send magic link"}
        </Button>

        {error && (
          <p className="text-destructive text-sm text-pretty" role="alert">
            {error}
          </p>
        )}
      </form>

      <p className="text-muted-foreground text-center text-sm">
        New here?{" "}
        <Link
          href={`/signup?next=${encodeURIComponent(next)}`}
          className="text-foreground font-medium underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
