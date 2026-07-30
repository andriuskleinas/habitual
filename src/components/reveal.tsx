"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Fades + lifts its children into view once they reach the fold.
 *
 * Deliberately fails open. The hiding class is only attached after mount, so
 * no-JS visitors and crawlers always get the content, and anything already at
 * or above the fold on mount is shown without animating.
 *
 * This checks position on scroll rather than using IntersectionObserver: an
 * instant jump (in-page anchor, restored scroll position, programmatic
 * scrollTo) can move an element from below the fold to above it within a single
 * frame, and the observer reports no change in that case — leaving the element
 * invisible permanently.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  /** Stagger in milliseconds, for sequencing siblings. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    // Slightly inside the fold, so the animation starts as the element appears.
    const inView = () =>
      node.getBoundingClientRect().top < window.innerHeight * 0.92;

    // Already on screen (or scrolled past) at mount — no animation.
    if (inView()) {
      setShown(true);
      return;
    }

    setArmed(true);

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
          setShown(true);
          cleanup();
        }
      });
    }

    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return cleanup;
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn(armed && "reveal", className)}
      data-revealed={shown ? "true" : undefined}
      style={
        delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined
      }
    >
      {children}
    </Tag>
  );
}
