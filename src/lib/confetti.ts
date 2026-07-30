/**
 * The signature "you did it" moment. A celebratory confetti burst fired on a
 * successful check-in. Lazy-imports canvas-confetti so it never touches the SSR
 * bundle or the initial client payload, and stays silent for users who ask for
 * reduced motion.
 *
 * Colors are pulled from the brand palette (violet primary + emerald success +
 * a warm streak-flame gold) so the burst reads as "Habitual", not generic.
 */

const BRAND_COLORS = ["#7c3aed", "#22c55e", "#f59e0b", "#a855f7", "#ffffff"];

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
