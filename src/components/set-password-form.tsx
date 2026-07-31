"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { checkPassword, MIN_PASSWORD_LENGTH, safeNext } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  PasswordInput,
  PasswordStrength,
} from "@/components/ui/password-input";

/**
 * Sets or changes the signed-in user's password.
 *
 * This — not `signUp` — is how a magic-link buddy becomes a full account
 * holder: they already have an `auth.users` row, and calling `signUp` with
 * their existing email silently no-ops behind Supabase's email-enumeration
 * protection. `updateUser` works whether or not a password already exists.
 */
export function SetPasswordForm({
  /** True when the user has never deliberately set a password. */
  isFirstTime,
  /** Where to send them afterwards. */
  next,
}: {
  isFirstTime: boolean;
  next: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const strength = checkPassword(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = strength.valid && confirm === password;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("idle");
      setError(error.message);
      return;
    }

    // Record OUR fact that a password now exists — auth.users can't tell us,
    // since magic-link users already carry a bcrypt hash. Non-fatal: the
    // password is set either way, this only drives the "finish your account"
    // prompt, so a failure here must not look like a failed password change.
    if (data.user) {
      await supabase
        .from("users")
        .update({ password_set_at: new Date().toISOString() })
        .eq("id", data.user.id);
    }

    setStatus("done");
    router.refresh();
    router.push(safeNext(next));
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="bg-success/10 text-success-ink flex size-14 items-center justify-center rounded-2xl">
          <CheckCircle2 className="size-7" aria-hidden />
        </span>
        <p className="font-medium">Password saved</p>
        <p className="text-muted-foreground text-sm">Taking you back…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">
          {isFirstTime ? "Choose a password" : "New password"}
        </Label>
        <PasswordInput
          id="new-password"
          name="new-password"
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={status === "saving"}
        />
        <PasswordStrength
          score={strength.score}
          label={strength.label}
          show={password.length > 0}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <PasswordInput
          id="confirm-password"
          name="confirm-password"
          autoComplete="new-password"
          placeholder="Type it again"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch}
          aria-describedby={mismatch ? "confirm-error" : undefined}
          disabled={status === "saving"}
        />
        {mismatch && (
          <p id="confirm-error" className="text-destructive text-xs" role="alert">
            Those two don&apos;t match yet.
          </p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!canSubmit || status === "saving"}
      >
        {status === "saving" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <KeyRound className="size-4" aria-hidden />
        )}
        {status === "saving"
          ? "Saving…"
          : isFirstTime
            ? "Set password"
            : "Update password"}
      </Button>

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
