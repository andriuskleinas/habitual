"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { logCheckIn, type LogCheckInState } from "@/app/challenges/actions";
import { celebrationKey } from "@/lib/confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="xl" className="w-full" disabled={pending}>
      {pending ? (
        <Loader2 className="size-5 animate-spin" aria-hidden />
      ) : (
        <CheckCircle2 className="size-5" aria-hidden />
      )}
      {pending ? "Saving…" : "Mark today done"}
    </Button>
  );
}

/**
 * Today's check-in. Only rendered while today is still unlogged — a day counts
 * once, so there is no edit mode; the server rejects a second insert on the
 * unique (challenge, date) constraint either way.
 */
export function CheckInForm({
  challengeId,
  dailyTarget,
  totalTarget,
  targetUnit,
  suggested,
  today,
}: {
  challengeId: string;
  dailyTarget: number;
  /** Set when the challenge is scored on a cumulative total. */
  totalTarget?: number | null;
  targetUnit?: string | null;
  /** Even-pace amount for this check-in, on a total challenge. */
  suggested?: number | null;
  /** Today as `YYYY-MM-DD`, used to hand the celebration to the done card. */
  today: string;
}) {
  const [state, formAction] = useActionState<LogCheckInState, FormData>(
    logCheckIn,
    {},
  );
  const isTotal = !!totalTarget;
  const tracksNumber = dailyTarget > 1 || isTotal;

  // A successful log revalidates the page and this form is replaced by the
  // "done for today" card — which may unmount us before any effect here could
  // run. So we leave a note for that card to pick up and celebrate with.
  function submit(formData: FormData) {
    try {
      sessionStorage.setItem(celebrationKey(challengeId), today);
    } catch {
      // Blocked storage just means no confetti; the check-in still lands.
    }
    formAction(formData);
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <input type="hidden" name="challenge_id" value={challengeId} />

      {tracksNumber ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="value">
            How much today?{" "}
            <span className="text-muted-foreground font-normal">
              {isTotal
                ? suggested
                  ? `(${suggested}${targetUnit ? ` ${targetUnit}` : ""} keeps you on pace)`
                  : "(counts toward your total)"
                : `(target ${dailyTarget}${targetUnit ? ` ${targetUnit}` : ""})`}
            </span>
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="value"
              name="value"
              type="number"
              inputMode="numeric"
              min={0}
              max={100000}
              defaultValue={isTotal ? (suggested ?? 1) : dailyTarget}
            />
            {targetUnit && (
              <span className="text-muted-foreground shrink-0 text-sm">
                {targetUnit}
              </span>
            )}
          </div>
        </div>
      ) : (
        <input type="hidden" name="value" value={1} />
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">
          Note <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="note"
          name="note"
          placeholder="How did it go?"
          maxLength={280}
          rows={2}
        />
      </div>

      {state.error && (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      )}
      {state.alreadyLogged && (
        <p className="text-muted-foreground text-sm" role="status">
          Today&apos;s already in the books. Refresh to see it.
        </p>
      )}

      <SubmitButton />
      <p className="text-muted-foreground text-center text-xs">
        One check-in a day — make it count.
      </p>
    </form>
  );
}
