"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Hand, Loader2, MessageCircle, PartyPopper } from "lucide-react";
import {
  sendReaction,
  type BuddyReaction,
  type SendReactionState,
} from "@/app/i/[token]/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Buddy action bar on the invite view. Cheer / nudge are one-tap; note opens a
 * short message field. The first action also claims the invite server-side, so
 * a signed-in watcher becomes a real buddy the moment they react.
 */
export function BuddyReactions({ token }: { token: string }) {
  const [state, formAction] = useActionState<SendReactionState, FormData>(
    sendReaction,
    {},
  );
  const [noteOpen, setNoteOpen] = useState(false);
  const [justSent, setJustSent] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // On a successful send, briefly confirm and reset the note field.
  useEffect(() => {
    if (state.ok) {
      setJustSent("Sent! 🎉");
      setNoteOpen(false);
      formRef.current?.reset();
      const t = setTimeout(() => setJustSent(null), 2500);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />

      <div className="grid grid-cols-3 gap-2">
        <ReactionButton type="cheer" icon={<PartyPopper className="size-4" />}>
          Cheer
        </ReactionButton>
        <ReactionButton type="nudge" icon={<Hand className="size-4" />}>
          Nudge
        </ReactionButton>
        <Button
          type="button"
          variant="outline"
          onClick={() => setNoteOpen((v) => !v)}
          aria-expanded={noteOpen}
        >
          <MessageCircle className="size-4" />
          Note
        </Button>
      </div>

      {noteOpen && (
        <div className="flex flex-col gap-2">
          <Textarea
            name="message"
            placeholder="Say something encouraging…"
            maxLength={500}
            rows={2}
            autoFocus
          />
          <NoteSubmit />
        </div>
      )}

      {state.error && (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      )}
      {justSent && (
        <p className="text-primary inline-flex items-center gap-1 text-sm font-medium">
          <Check className="size-4" />
          {justSent}
        </p>
      )}
    </form>
  );
}

/** One-tap reaction: submits the form with its `type` via formData. */
function ReactionButton({
  type,
  icon,
  children,
}: {
  type: Exclude<BuddyReaction, "note">;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="type"
      value={type}
      variant="outline"
      disabled={pending}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </Button>
  );
}

/** Submit button scoped to the note field (carries type=note). */
function NoteSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" name="type" value="note" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <MessageCircle className="size-4" />
      )}
      Send note
    </Button>
  );
}
