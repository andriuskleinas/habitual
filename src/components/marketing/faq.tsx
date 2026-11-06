import { Plus } from "lucide-react";

export const FAQS = [
  {
    q: "Does my buddy need an account?",
    a: "No. They open your invite link and see your streak, progress and stake straight away, with nothing to install. They only sign in if they want to cheer, nudge or leave a note.",
  },
  {
    q: "What counts as a stake?",
    a: "Anything you'd rather not lose. Most people pick something small and social, like buying lunch or doing the dishes for a week. Habitual doesn't handle money. The stake is an agreement between you and your buddy.",
  },
  {
    q: "What happens if I miss a day?",
    a: "Your current streak resets, but your history and your best streak stay. A day only counts as missed once it's over, so a late check-in still counts. If you allowed skips when you set the challenge, a miss uses one. Go past them and the challenge is lost.",
  },
  {
    q: "Do I need a password?",
    a: "No. You can sign in with a magic link sent to your email, or set a password if you prefer.",
  },
  {
    q: "Can I run more than one challenge?",
    a: "Yes. Each challenge has its own streak, stake and buddy link, and they all sit together on your dashboard.",
  },
  {
    q: "How much does it cost?",
    a: "Nothing. Habitual is free, and there's no card to enter.",
  },
];

/**
 * Native `<details>` accordion: keyboard-operable, screen-reader friendly and
 * findable by in-page search, with no JavaScript.
 *
 * Hairline rows rather than a boxed card. The open/close slide is pure CSS
 * (`.faq-item`, see globals.css) and purely decorative; where
 * `::details-content` transitions aren't supported the panel simply appears.
 */
export function Faq() {
  return (
    <div className="border-border divide-border divide-y border-y">
      {FAQS.map(({ q, a }) => (
        <details key={q} className="faq-item group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-lg tracking-[-0.015em]">
            {q}
            <span className="border-border text-muted-foreground group-hover:text-foreground group-open:bg-foreground group-open:text-background group-open:border-foreground flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors">
              <Plus
                className="size-4 transition-transform duration-300 group-open:rotate-45"
                aria-hidden
              />
            </span>
          </summary>
          <p className="text-muted-foreground max-w-prose pb-6 text-pretty">
            {a}
          </p>
        </details>
      ))}
    </div>
  );
}
