import { Plus } from "lucide-react";

export const FAQS = [
  {
    q: "Does my buddy need an account?",
    a: "No. They open your invite link and see your streak, progress and stakes straight away — no sign-up, no app install. They only sign in if they want to cheer you on or nudge you.",
  },
  {
    q: "What counts as a stake?",
    a: "Anything you'd rather not lose. Most people write something small and social — “lunch on me”, “I do the dishes for a week”. Habitual doesn't handle money; the stake is between you and your buddy, which is exactly what makes it work.",
  },
  {
    q: "What happens if I miss a day?",
    a: "Your current streak resets, but your history and your best streak stay. Missing today doesn't break the streak until the day is actually over, so a late check-in still counts.",
  },
  {
    q: "Do I need a password?",
    a: "No. You enter your email and we send a magic link — one tap and you're in, on any device.",
  },
  {
    q: "Can I run more than one challenge?",
    a: "Yes. Each challenge has its own streak, its own stake and its own buddy link, and they all sit together on your dashboard.",
  },
  {
    q: "How much does it cost?",
    a: "Habitual is free to use. Create a challenge, invite a buddy, keep your streak — no card needed.",
  },
];

/**
 * Native `<details>` accordion: keyboard-operable, screen-reader friendly and
 * findable by in-page search, with no JavaScript.
 *
 * The open/close slide is pure CSS (`.faq-item`, see globals.css) and purely
 * decorative — where `::details-content` transitions aren't supported the panel
 * simply appears, which is the native behaviour and perfectly fine.
 */
export function Faq() {
  return (
    <div className="divide-border border-border bg-card divide-y rounded-2xl border">
      {FAQS.map(({ q, a }) => (
        <details
          key={q}
          className="faq-item group hover:bg-muted/40 px-5 py-1 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-medium">
            {q}
            <span className="bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-open:bg-primary/10 group-open:text-primary flex size-7 shrink-0 items-center justify-center rounded-full transition-colors">
              <Plus
                className="size-4 transition-transform duration-300 group-open:rotate-45"
                aria-hidden
              />
            </span>
          </summary>
          <p className="text-muted-foreground pb-4 text-pretty">{a}</p>
        </details>
      ))}
    </div>
  );
}
