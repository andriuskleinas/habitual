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

/**
 * Where the mark sits. `default` is the page background in either theme;
 * `inverse` is the ink band, which is the same colour for everyone.
 */
type LogoTone = "default" | "inverse";

/**
 * Monochrome, like the type around it: the tile takes the text colour of the
 * surface it sits on and the glyph is cut out of it. Colour in this product
 * means something (indigo acts, green is kept, amber is at stake), so the logo
 * stays out of that system instead of borrowing one of its meanings.
 */
const TILE: Record<LogoTone, string> = {
  default: "bg-foreground text-background",
  inverse: "bg-ink-foreground text-ink",
};

/** The monogram tile on its own — used wherever the wordmark won't fit. */
export function LogoMark({
  tone = "default",
  className,
}: {
  tone?: LogoTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-8 items-center justify-center rounded-[9px]",
        TILE[tone],
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
  tone = "default",
  className,
}: {
  /** Pass `null` to render a non-interactive mark (e.g. on the page it links to). */
  href?: string | null;
  tone?: LogoTone;
  className?: string;
}) {
  const inner = (
    <>
      <LogoMark tone={tone} />
      <span className="text-lg font-medium tracking-[-0.03em]">Habitual</span>
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
