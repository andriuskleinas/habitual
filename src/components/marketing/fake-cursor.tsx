"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

/**
 * A pointer that glides to a target and "clicks" it, for the scripted demos.
 *
 * Positioned inside a `relative` container; `target` is measured against that
 * container whenever `targetKey` changes, so the cursor lands on the real
 * element wherever the layout put it. Purely decorative.
 */
export function FakeCursor({
  container,
  target,
  targetKey,
  visible,
  pressed,
}: {
  container: RefObject<HTMLElement | null>;
  target: RefObject<HTMLElement | null> | null;
  /** Change this to re-measure (e.g. the current step). */
  targetKey: string | number;
  visible: boolean;
  pressed: boolean;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const box = container.current;
    const el = target?.current;
    if (!box) return;
    const b = box.getBoundingClientRect();
    if (!el) {
      // Park off to the lower right, where a hand would come in from.
      setPos({ x: b.width * 0.86, y: b.height * 0.96 });
      return;
    }
    const r = el.getBoundingClientRect();
    setPos({
      x: r.left - b.left + r.width * 0.62,
      y: r.top - b.top + r.height * 0.58,
    });
  }, [container, target, targetKey]);

  if (!pos) return null;

  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-20 transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      {pressed && (
        <span className="animate-click-ripple absolute -top-3 -left-3 size-6 rounded-full bg-black/25" />
      )}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        className={cn(
          "drop-shadow-[0_1px_2px_rgb(0_0_0/0.35)] transition-transform duration-150",
          pressed ? "scale-[0.82]" : "scale-100",
        )}
      >
        <path
          d="M3 2l13 7.2-5.6 1.4 3.3 6-2.3 1.2-3.3-6L3.8 16z"
          fill="#0B0F19"
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
