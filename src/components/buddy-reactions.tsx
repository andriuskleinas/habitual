"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, Loader2, Send } from "lucide-react";
import { sendReaction, type SendReactionState } from "@/app/i/[token]/actions";
import { BUDDY_REACTIONS, type BuddyReaction } from "@/lib/reactions";
import { celebrateReaction } from "@/lib/confetti";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Buddy action bar on the invite view (signed-in). Cheer / nudge are one-tap;
 * note opens a short message field. The first action also claims the invite
 * server-side, so a signed-in watcher becomes a real buddy the moment they react.
 *
 * `pending` replays the choice someone made *before* signing in: they tapped
 * "Cheer", got bounced through the magic link, and land back here — the cheer
 * fires on arrival rather than asking them to decide a second time.
 */
export function BuddyReactions({
  token,
  ownerName,
  pending = null,
}: {
  token: string;
  ownerName: string;
  pending?: BuddyReaction | null;
}) {
  const [state, formAction] = useActionState<SendReactionState, FormData>(
    sendReaction,
    {},
  );
  const [noteOpen, setNoteOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Replay a pre-sign-in choice exactly once, then drop `?r=` from the URL so a
  // refresh (or a shared link) doesn't fire a second reaction.
  const replayed = useRef(false);
  useEffect(() => {
    if (!pending || replayed.current) return;
    replayed.current = true;

    if (pending === "note") {
      setNoteOpen(true);
    } else {
      const data = new FormData();
      data.set("token", token);
      data.set("type", pending);
      formAction(data);
    }
    router.replace(pathname, { scroll: false });
  }, [pending, token, formAction, router, pathname]);

  // On a successful send, celebrate and reset the note field.
  useEffect(() => {
    if (!state.ok) return;
    setSent(true);
    setNoteOpen(false);
    formRef.current?.reset();
    void celebrateReaction();
  }, [state]);

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="bg-success/10 text-success-ink flex size-12 items-center justify-center rounded-2xl">
          <Check className="size-6" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Sent — {ownerName} will see it.</p>
          <p className="text-muted-foreground text-sm text-pretty">
            You&apos;re their accountability buddy now. Come back any day to see
            whether they held up their end.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSent(false)}>
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />

      <div className="grid grid-cols-3 gap-2">
        {BUDDY_REACTIONS.map((c) =>
          c.type === "note" ? (
            <Button
              key={c.type}
              type="button"
              size="lg"
              variant="outline"
              className="h-auto flex-col gap-1 py-3"
              onClick={() => setNoteOpen((v) => !v)}
              aria-expanded={noteOpen}
            >
              <span className="text-xl leading-none" aria-hidden>
                {c.emoji}
              </span>
              {c.label}
            </Button>
          ) : (
            <ReactionButton key={c.type} type={c.type} emoji={c.emoji}>
              {c.label}
            </ReactionButton>
          ),
        )}
      </div>

      {noteOpen && (
        <div className="flex flex-col gap-2">
          <Textarea
            name="message"
            placeholder={`Say something to ${ownerName}…`}
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
    </form>
  );
}

/** One-tap reaction: submits the form with its `type` via formData. */
function ReactionButton({
  type,
  emoji,
  children,
}: {
  type: Exclude<BuddyReaction, "note">;
  emoji: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="type"
      value={type}
      size="lg"
      variant="outline"
      className="h-auto flex-col gap-1 py-3"
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="size-5 animate-spin" aria-hidden />
      ) : (
        <span className="text-xl leading-none" aria-hidden>
          {emoji}
        </span>
      )}
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
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Send className="size-4" aria-hidden />
      )}
      Send note
    </Button>
  );
}

/**
 * Signed-out version of the same bar.
 *
 * This is the page's whole conversion story: instead of a "Sign in to cheer"
 * wall, the visitor gets the real buttons and picks a reaction *first*. The
 * choice rides along in `?next=` through sign-in and fires automatically when
 * they land back here — so the sign-in step reads as finishing something they
 * already started, not as a toll gate.
 */
export function CheerPrompt({
  token,
  ownerName,
}: {
  token: string;
  ownerName: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {BUDDY_REACTIONS.map((c) => (
          <Button
            key={c.type}
            size="lg"
            variant="outline"
            className="h-auto flex-col gap-1 py-3"
            asChild
          >
            <Link
              href={`/login?next=${encodeURIComponent(`/i/${token}?r=${c.type}`)}`}
            >
              <span className="text-xl leading-none" aria-hidden>
                {c.emoji}
              </span>
              {c.label}
            </Link>
          </Button>
        ))}
      </div>
      <p className="text-muted-foreground text-center text-xs text-pretty">
        Pick one — we&apos;ll email you a one-tap link and send it to{" "}
        {ownerName} the moment you&apos;re in. No password, free, 10 seconds.
      </p>
    </div>
  );
}
