"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Pencil } from "lucide-react";
import { logCheckIn, type LogCheckInState } from "@/app/challenges/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TodayCheckIn = { value: number; note: string | null };

function SubmitButton({ doneToday }: { doneToday: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : doneToday ? (
        <Pencil className="size-4" />
      ) : (
        <CheckCircle2 className="size-4" />
      )}
      {pending
        ? "Saving…"
        : doneToday
          ? "Update today's log"
          : "Mark today done"}
    </Button>
  );
}

export function CheckInForm({
  challengeId,
  dailyTarget,
  today,
}: {
  challengeId: string;
  dailyTarget: number;
  today: TodayCheckIn | null;
}) {
  const [state, formAction] = useActionState<LogCheckInState, FormData>(
    logCheckIn,
    {},
  );
  const doneToday = today !== null;
  const tracksNumber = dailyTarget > 1;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="challenge_id" value={challengeId} />

      {tracksNumber ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="value">
            How much today?{" "}
            <span className="text-muted-foreground font-normal">
              (target {dailyTarget})
            </span>
          </Label>
          <Input
            id="value"
            name="value"
            type="number"
            inputMode="numeric"
            min={0}
            max={100000}
            defaultValue={today?.value ?? dailyTarget}
          />
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
          defaultValue={today?.note ?? ""}
        />
      </div>

      {state.error && (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton doneToday={doneToday} />
    </form>
  );
}
