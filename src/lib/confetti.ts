/**
 * The signature "you did it" moment. A celebratory confetti burst fired on a
 * successful check-in. Lazy-imports canvas-confetti so it never touches the SSR
 * bundle or the initial client payload, and stays silent for users who ask for
 * reduced motion.
 *
 * Colours are the brand palette itself — deep indigo, fresh green, soft amber,
 * plus a lighter indigo and white to keep the burst from going muddy — so the
 * confetti reads as "Habitual", not generic. Literal hex because canvas-confetti
 * paints to a canvas and can't resolve a CSS custom property.
 */

const BRAND_COLORS = ["#344EAD", "#2FA76A", "#F5B942", "#5C7AD6", "#FFFFFF"];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * Fire the check-in celebration. Pass the current streak so milestone days
 * (7, 30, 66, 90, and every multiple of 10) get an extra, bigger burst.
 */
export async function celebrateCheckIn(streak = 0): Promise<void> {
  if (prefersReducedMotion()) return;

  const { default: confetti } = await import("canvas-confetti");

  // A pair of side cannons converging toward the middle — feels like a "pop"
  // rising from the button rather than raining down from the top.
  const base = {
    spread: 70,
    startVelocity: 45,
    ticks: 220,
    gravity: 0.9,
    colors: BRAND_COLORS,
    disableForReducedMotion: true,
  } as const;

  confetti({ ...base, particleCount: 60, angle: 60, origin: { x: 0, y: 0.75 } });
  confetti({ ...base, particleCount: 60, angle: 120, origin: { x: 1, y: 0.75 } });

  const isMilestone = streak > 0 && (MILESTONES.has(streak) || streak % 10 === 0);
  if (!isMilestone) return;

  // Milestone: a fuller center burst a beat later for the "big deal" feeling.
  window.setTimeout(() => {
    confetti({
      ...base,
      particleCount: 140,
      spread: 110,
      startVelocity: 55,
      origin: { x: 0.5, y: 0.6 },
      scalar: 1.1,
    });
  }, 220);
}

const MILESTONES = new Set([7, 21, 30, 66, 90, 100]);

/**
 * The same burst, fired when a *buddy* sends a reaction from the invite page.
 * Sending a cheer is the moment a watcher becomes a participant, so it gets the
 * same payoff the owner gets for checking in.
 */
export async function celebrateReaction(): Promise<void> {
  return celebrateCheckIn(0);
}

/**
 * sessionStorage key used to hand a pending celebration from the check-in form
 * to the "done for today" card that replaces it. The form can't fire the
 * confetti itself: a successful log revalidates the page and unmounts it,
 * potentially before any effect runs. The value stored is the check-in date, so
 * a stale flag from another day is ignored rather than misfiring.
 */
export function celebrationKey(challengeId: string): string {
  return `habitual:celebrate:${challengeId}`;
}
