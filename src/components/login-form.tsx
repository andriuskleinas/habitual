"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    searchParams.get("error") ? "error" : "idle",
  );
  const [message, setMessage] = useState<string | null>(
    searchParams.get("error")
      ? "That sign-in link didn't work. Try again."
      : null,
  );

  const next = searchParams.get("next") ?? "/dashboard";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);

    const supabase = createClient();
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Sign in to Habitual</h1>
        <p className="text-muted-foreground text-pretty">
          Enter your email and we&apos;ll send a magic link — no password to
          remember.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
            aria-invalid={status === "error"}
            aria-describedby={message ? "login-error" : undefined}
            disabled={status === "sending"}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={status === "sending" || email.length === 0}
        >
          {status === "sending" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Mail className="size-4" aria-hidden />
          )}
          {status === "sending" ? "Sending link…" : "Send magic link"}
        </Button>
        {message && (
          <p id="login-error" className="text-destructive text-sm" role="alert">
            {message}
          </p>
        )}
      </form>

      <p className="text-muted-foreground text-center text-xs text-pretty">
        By continuing you agree to keep your streak honest. That&apos;s the only
        rule.
      </p>
    </div>
  );
}
