/**
 * The reactions a buddy can send from the invite view.
 *
 * A plain module on purpose: the server action validates against it, the
 * invite page (a Server Component) parses `?r=` with it, and the client bar
 * renders it — and neither a `"use server"` file (async exports only) nor a
 * `"use client"` file (no server-side calls) can host a shared helper.
 *
 * Emoji rather than icons: this is the one playful control on the page, and it
 * has to read as "tap me" to someone who has never seen the product before.
 */
export const BUDDY_REACTIONS = [
  { type: "cheer", emoji: "🎉", label: "Cheer" },
  { type: "nudge", emoji: "👋", label: "Nudge" },
  { type: "note", emoji: "💬", label: "Note" },
] as const;

export type BuddyReaction = (typeof BUDDY_REACTIONS)[number]["type"];

const VALID = new Set<string>(BUDDY_REACTIONS.map((r) => r.type));

export function isBuddyReaction(value: unknown): value is BuddyReaction {
  return typeof value === "string" && VALID.has(value);
}

/**
 * The reaction someone picked *before* signing in, carried through the
 * magic-link round trip as `?r=` and replayed on arrival. Anything unknown is
 * dropped rather than trusted — it arrives from a URL.
 */
export function parsePendingReaction(
  value: string | undefined,
): BuddyReaction | null {
  return isBuddyReaction(value) ? value : null;
}
