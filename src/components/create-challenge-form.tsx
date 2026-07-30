"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Sparkles } from "lucide-react";
import {
  createChallenge,
  type CreateChallengeState,
} from "@/app/challenges/actions";
import { CADENCES, DURATIONS } from "@/lib/challenges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Sparkles className="size-4" />
      )}
      {pending ? "Creating…" : "Create challenge"}
    </Button>
  );
}

export function CreateChallengeForm() {
  const [state, formAction] = useActionState<CreateChallengeState, FormData>(
    createChallenge,
    {},
  );
  // Show the numeric target field only when it's more than a simple done/not-done.
  const [showTarget, setShowTarget] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Challenge</Label>
        <Input
          id="title"
          name="title"
          placeholder="Read 20 pages a day"
          required
          minLength={3}
          maxLength={80}
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cadence">How often</Label>
        <Select id="cadence" name="cadence" defaultValue="daily">
          {CADENCES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="duration">For how long</Label>
        <Select id="duration" name="duration" defaultValue="30">
          {DURATIONS.map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="daily_target">Daily target</Label>
          <button
            type="button"
            onClick={() => setShowTarget((v) => !v)}
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
          >
            {showTarget ? "Just mark it done" : "Track a number"}
          </button>
        </div>
        {showTarget ? (
          <>
            <Input
              id="daily_target"
              name="daily_target"
              type="number"
              inputMode="numeric"
              min={1}
              max={100000}
              defaultValue={20}
            />
            <p className="text-muted-foreground text-xs">
              e.g. 20 pages, 30 minutes, 100 push-ups.
            </p>
          </>
        ) : (
          // Keep a value in the payload so the field is always present.
          <input type="hidden" name="daily_target" value={1} />
        )}
        {!showTarget && (
          <p className="text-muted-foreground text-xs">
            Each day is a simple done / not-done.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stake_text">
          Stake <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="stake_text"
          name="stake_text"
          placeholder="Lunch on me if I miss a day."
          maxLength={200}
          rows={2}
        />
        <p className="text-muted-foreground text-xs">
          What&apos;s on the line? Your buddy will hold you to it.
        </p>
      </div>

      {state.error && (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
