"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Phone-only action bar for the invite page.
 *
 * The reaction card sits mid-page, so on a phone it scrolls out of reach the
 * moment someone starts reading the history — exactly when they're most
 * convinced. The bar keeps the action within thumb reach, and hides itself
 * while the real card is on screen so there's never a duplicate CTA in view.
 *
 * Starts hidden and is only revealed by the observer, so it never flashes over
 * the card on first paint.
 */
export function StickyCheerBar({
  href,
  label,
  watchId,
}: {
  href: string;
  label: string;
  /** id of the element whose visibility suppresses the bar. */
  watchId: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) return;

    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { rootMargin: "-25% 0px -25% 0px" },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [watchId]);

  return (
    <div
      className={`bg-background/90 fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 backdrop-blur-md transition-transform duration-200 sm:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      // Duplicates a link that exists in the page; hide it from AT rather than
      // announcing the same action twice.
      aria-hidden={!show}
    >
      <Button size="xl" className="w-full" asChild tabIndex={show ? 0 : -1}>
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  );
}
