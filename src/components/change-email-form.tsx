"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, MailCheck } from "lucide-react";
import { updateEmail, type UpdateEmailState } from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending || disabled}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? "Sending…" : "Send confirmation link"}
    </Button>
  );
}

/**
 * Email changes go through auth, not the profile table: Supabase mails a
 * confirmation link and nothing moves until it's clicked. The form therefore
 * ends in a "check your inbox" state rather than a "saved" one — pretending it
 * took effect immediately would be a lie the next page load exposes.
 */
export function ChangeEmailForm({ current }: { current: string }) {
  const [state, formAction] = useActionState<UpdateEmailState, FormData>(
    updateEmail,
    {},
  );
  const [email, setEmail] = useState("");

  if (state.sentTo) {
    return (
      <div className="ring-success/25 bg-success/[0.07] flex items-start gap-3 rounded-xl px-4 py-3.5">
        <MailCheck className="text-success-ink mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Check your inbox</p>
          <p className="text-muted-foreground text-sm text-pretty">
            We sent a confirmation link to{" "}
            <span className="text-foreground font-medium">{state.sentTo}</span>.
            Your address stays {current} until you click it — and you may need to
            confirm from both addresses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={current}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby="email-hint"
        />
        <p id="email-hint" className="text-muted-foreground text-xs">
          Currently {current}. This is where sign-in links and buddy nudges go.
        </p>
      </div>

      {state.error && (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      )}

      <div>
        <SubmitButton
          disabled={
            email.trim().length === 0 ||
            email.trim().toLowerCase() === current.toLowerCase()
          }
        />
      </div>
    </form>
  );
}
