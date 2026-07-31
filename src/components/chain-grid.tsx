import type { Period } from "@/lib/challenges";

/**
 * One cell per scheduled check-in: filled when logged, red once a slot has
 * elapsed unfilled, outlined for the one that's live right now, faint for
 * what's still ahead.
 *
 * Shared by the owner view and the buddy (invite) view. On the invite page it
 * does the heavy lifting a "1 day streak" number can't: it shows the *shape* of
 * the commitment — how much is left, and how fragile the run currently is.
 * Decorative by default; the same numbers are always stated in text nearby.
 */
export function ChainGrid({
  periods,
  done,
  today,
  legend = false,
  className = "",
}: {
  periods: Period[];
  done: Set<string>;
  today: string;
  /** Show the colour key. Worth it for a first-time viewer, noise for the owner. */
  legend?: boolean;
  className?: string;
}) {
  const dates = [...done];

  return (
    <div
      className={`ring-foreground/10 flex flex-col gap-3 rounded-2xl px-5 py-4 ring-1 ${className}`}
    >
      <div className="grid grid-cols-10 gap-1.5 sm:grid-cols-15" aria-hidden>
        {periods.slice(0, 120).map((p) => {
          const filled =
            p.start === p.end
              ? done.has(p.start)
              : dates.some((d) => d >= p.start && d <= p.end);
          const isPast = p.end < today;
          const isNow = p.start <= today && today <= p.end;
          return (
            <span
              key={p.start}
              title={p.start === p.end ? p.start : `${p.start} – ${p.end}`}
              className={
                filled
                  ? "bg-primary aspect-square rounded-[4px]"
                  : isPast
                    ? "bg-destructive/35 aspect-square rounded-[4px]"
                    : isNow
                      ? "ring-primary/60 aspect-square rounded-[4px] ring-2"
                      : "bg-muted-foreground/15 aspect-square rounded-[4px]"
              }
            />
          );
        })}
      </div>

      {legend && (
        <ul className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.7rem]">
          <LegendKey className="bg-primary">done</LegendKey>
          <LegendKey className="bg-destructive/35">missed</LegendKey>
          <LegendKey className="ring-primary/60 ring-2">today</LegendKey>
          <LegendKey className="bg-muted-foreground/15">to come</LegendKey>
        </ul>
      )}
    </div>
  );
}

function LegendKey({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`size-2.5 rounded-[3px] ${className}`} aria-hidden />
      {children}
    </li>
  );
}
