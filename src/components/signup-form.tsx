"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, MailCheck, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  checkPassword,
  isExistingAccount,
  MIN_PASSWORD_LENGTH,
  safeNext,
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PasswordInput,
  PasswordStrength,
} from "@/components/ui/password-input";

export function SignupForm() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState(false);

  const strength = checkPassword(password);
  const canSubmit =
    name.trim().length > 0 && email.length > 0 && strength.valid;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    setExisting(false);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // `handle_new_user` maps this into public.users.name on the DB side.
        data: { name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setStatus("idle");
      setError(error.message);
      return;
    }

    // Supabase hides "email already registered" behind an empty identities
    // array rather than an error — surface it so the user isn't left waiting.
    if (isExistingAccount(data.user)) {
      setStatus("idle");
      setExisting(true);
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
          <h1 className="text-2xl font-bold tracking-tight">
            Confirm your email
          </h1>
          <p className="text-muted-foreground text-pretty">
            We sent a confirmation link to{" "}
            <span className="text-foreground font-medium break-all">
              {email}
            </span>
            . Click it to activate your account — then you can sign in with your
            password any time.
          </p>
        </div>
        <p className="text-muted-foreground text-sm">
          Nothing yet? Check your spam folder.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Create your account
        </h1>
        <p className="text-muted-foreground text-pretty">
          Start your own challenge and invite a buddy to keep you honest.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Alex"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={status === "sending"}
          />
        </div>

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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "sending"}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={status === "sending"}
            aria-describedby="password-hint"
          />
          <PasswordStrength
            score={strength.score}
            label={strength.label}
            show={password.length > 0}
          />
          <p id="password-hint" className="text-muted-foreground text-xs">
            At least {MIN_PASSWORD_LENGTH} characters. A short phrase you&apos;ll
            remember beats a scrambled word.
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!canSubmit || status === "sending"}
        >
          {status === "sending" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <UserPlus className="size-4" aria-hidden />
          )}
          {status === "sending" ? "Creating account…" : "Create account"}
        </Button>

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
        {existing && (
          <p className="text-sm text-pretty" role="alert">
            That email already has an account.{" "}
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="text-primary font-medium underline underline-offset-4"
            >
              Sign in instead
            </Link>
            .
          </p>
        )}
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="text-foreground font-medium underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
