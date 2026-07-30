"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // The recovery link signs them in, then lands on the change form.
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account/password")}`,
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
          {/* Deliberately does not confirm whether the address exists. */}
          <p className="text-muted-foreground text-pretty">
            If there&apos;s an account for{" "}
            <span className="text-foreground font-medium break-all">{email}</span>
            , we&apos;ve sent a link to reset the password.
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/login">
            <ArrowLeft className="size-4" aria-hidden />
            Back to sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
        <p className="text-muted-foreground text-pretty">
          Enter your email and we&apos;ll send a link to set a new one.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <Send className="size-4" aria-hidden />
          )}
          {status === "sending" ? "Sending…" : "Send reset link"}
        </Button>

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
      </form>

      <Link
        href="/login"
        className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 rounded-sm text-sm transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to sign in
      </Link>
    </div>
  );
}
