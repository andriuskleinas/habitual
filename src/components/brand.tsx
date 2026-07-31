import Link from "next/link";
import { cn } from "@/lib/utils";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/lib/logo";

/**
 * The bare monogram, no tile — for anywhere that supplies its own background.
 * Takes its colour from `currentColor`, and its size from the height it's
 * given (the viewBox supplies the width).
 */
export function LogoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} fill="currentColor" aria-hidden className={className}>
      <path d={LOGO_PATH} />
    </svg>
  );
}

/** The monogram tile on its own — used wherever the wordmark won't fit. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "from-brand-from to-brand-to text-primary-foreground flex size-8 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm",
        className,
      )}
    >
      {/* Sized as a share of the tile, so passing a bigger `size-*` above
          scales the mark with it instead of stranding it in the middle. */}
      <LogoGlyph className="h-[56%] w-auto" />
    </span>
  );
}

/**
 * Logo + wordmark, linked home by default. Every page used to hand-roll this;
 * one component keeps the mark identical across the app.
 */
export function Wordmark({
  href = "/",
  className,
}: {
  /** Pass `null` to render a non-interactive mark (e.g. on the page it links to). */
  href?: string | null;
  className?: string;
}) {
  const inner = (
    <>
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">Habitual</span>
    </>
  );

  if (href === null) {
    return (
      <span className={cn("flex items-center gap-2", className)}>{inner}</span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "hover:opacity-80 flex items-center gap-2 rounded-lg transition-opacity",
        className,
      )}
    >
      {inner}
    </Link>
  );
}
