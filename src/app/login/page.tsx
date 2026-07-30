"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Flame, Mail, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    searchParams.get("error") ? "error" : "idle",
  );
  const [message, setMessage] = useState<string | null>(
    searchParams.get("error") ? "That sign-in link didn't work. Try again." : null,
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
      <div className="flex flex-col items-start gap-4">
        <div className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-xl">
          <MailCheck className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
          <p className="text-muted-foreground text-pretty">
            We sent a magic link to <span className="text-foreground font-medium">{email}</span>.
            Tap it on this device to sign in.
          </p>
        </div>
        <Button
          variant="ghost"
          className="mt-2"
          onClick={() => {
            setStatus("idle");
            setEmail("");
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Sign in to Habitual</h1>
        <p className="text-muted-foreground text-pretty">
          Enter your email and we&apos;ll send you a magic link — no password needed.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={status === "error"}
          disabled={status === "sending"}
        />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={status === "sending" || email.length === 0}
        >
          <Mail className="size-4" />
          {status === "sending" ? "Sending link…" : "Send magic link"}
        </Button>
        {message && (
          <p className="text-destructive text-sm" role="alert">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <header className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <Flame className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Habitual</span>
        </Link>
      </header>

      <section className="mt-16">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
