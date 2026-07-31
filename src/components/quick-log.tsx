"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";
import { logCheckIn, type LogCheckInState } from "@/app/challenges/actions";
import { celebrateCheckIn } from "@/lib/confetti";
import { Button } from "@/components/ui/button";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Check className="size-3.5" aria-hidden />
      )}
      {pending ? "Saving…" : label}
    </Button>
  );
}

/**
 * One-tap check-in straight from a dashboard card.
 *
 * The dashboard's job is to get today logged, and making people open a
 * challenge first put a whole page load between them and the one action that
 * matters. Only offered where the value is knowable without asking — a plain
 * tick, or a fixed per-check-in target. Cumulative goals still go to the
 * detail page, because "how much?" is the point of them.
 *
 * The confetti fires optimistically on submit: a successful log revalidates
 * the dashboard, which re-sorts this card into another section and unmounts us
 * before an effect could run (the same reason the detail form hands its
 * celebration off through sessionStorage).
 */
export function QuickLog({
  challengeId,
  value,
  streak,
  label = "Log now",
}: {
  challengeId: string;
  /** What to record. 1 for a tick, the per-check-in target otherwise. */
  value: number;
  /** Current streak, so a milestone check-in gets the bigger burst. */
  streak: number;
  label?: string;
}) {
  const [state, formAction] = useActionState<LogCheckInState, FormData>(
    logCheckIn,
    {},
  );

  function submit(formData: FormData) {
    void celebrateCheckIn(streak + 1);
    formAction(formData);
  }

  return (
    <form action={submit} className="flex items-center gap-2">
      <input type="hidden" name="challenge_id" value={challengeId} />
      <input type="hidden" name="value" value={value} />
      {(state.error || state.alreadyLogged) && (
        <span className="text-muted-foreground text-xs" role="status">
          {state.alreadyLogged ? "Already logged" : "Didn't save"}
        </span>
      )}
      <SubmitButton label={label} />
    </form>
  );
}
