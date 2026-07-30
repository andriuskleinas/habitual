import Link from "next/link";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/** The flame tile on its own — used wherever the wordmark won't fit. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "from-brand-from to-brand-to text-primary-foreground flex size-8 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm",
        className,
      )}
    >
      <Flame className="size-5" aria-hidden />
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
