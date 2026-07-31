"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Thirty scheduled days with two misses — a realistic month, not a perfect one. */
const PATTERN = Array.from({ length: 30 }, (_, i) => i !== 4 && i !== 11);
const STEP_MS = 42;

/**
 * The streak grid from the app, drawing itself in when it reaches the fold.
 *
 * A static block of squares states that a chain exists; watching it build says
 * what a chain *is*, which is the one idea the whole product rests on. The
 * counter underneath ticks along with it, so the number and the picture agree
 * frame by frame.
 *
 * Fails to *finished*, not to empty. The starting state is the completed grid,
 * and it's only cleared once we've established the element is below the fold and
 * the animation is really going to run — so no-JS, reduced-motion and a tab that
 * was backgrounded through the whole scroll all land on the honest picture
 * rather than on a grid reading "0 / 30 days kept".
 *
 * The whole grid is a single button rather than thirty — replaying is the only
 * action, and thirty tab stops on a landing page is a worse trade than the fun
 * is worth. Purely decorative, so the counter carries the meaning for anyone who
 * isn't watching the squares.
 */
export function ChainDemo() {
  const ref = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [drawn, setDrawn] = useState(PATTERN.length);

  const play = useCallback(() => {
    window.clearInterval(timer.current);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDrawn(PATTERN.length);
      return;
    }

    setDrawn(0);
    timer.current = window.setInterval(() => {
      setDrawn((n) => {
        if (n >= PATTERN.length) {
          window.clearInterval(timer.current);
          return n;
        }
        return n + 1;
      });
    }, STEP_MS);
  }, []);

  // Same fold check as `Reveal`, and for the same reason: an instant jump
  // (anchor link, restored scroll) moves an element past the fold inside one
  // frame, which IntersectionObserver reports as no change at all.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const inView = () =>
      node.getBoundingClientRect().top < window.innerHeight * 0.9;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (inView()) {
      play();
      return () => window.clearInterval(timer.current);
    }

    // Below the fold and about to animate, so clearing it is unobserved.
    setDrawn(0);

    let raf = 0;
    const cleanup = () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      cancelAnimationFrame(raf);
    };
    function check() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (inView()) {
          cleanup();
          play();
        }
      });
    }

    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      cleanup();
      window.clearInterval(timer.current);
    };
  }, [play]);

  const kept = PATTERN.slice(0, drawn).filter(Boolean).length;
  const percent = Math.round((kept / PATTERN.length) * 100);

  return (
    <div className="flex flex-col gap-3">
      <button
        ref={ref}
        type="button"
        onClick={play}
        aria-label="Replay the streak animation"
        className="group/chain grid grid-cols-10 gap-1.5 rounded-lg sm:gap-2"
      >
        {PATTERN.map((on, i) => (
          <span
            key={i}
            className={cn(
              "aspect-square rounded-[5px] transition-all duration-300",
              i >= drawn
                ? "bg-muted-foreground/10 scale-90 opacity-40"
                : on
                  ? "bg-success group-hover/chain:scale-105"
                  : "bg-muted-foreground/15",
            )}
          />
        ))}
      </button>
      <p className="text-muted-foreground flex items-center justify-between text-xs tabular-nums">
        <span>
          <span className="text-success-ink font-semibold">{kept}</span> /{" "}
          {PATTERN.length} days kept
        </span>
        <span>{percent}%</span>
      </p>
    </div>
  );
}
