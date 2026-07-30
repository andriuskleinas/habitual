import { cn } from "@/lib/utils";

/** Placeholder block for loading states. Hidden from assistive tech — the
 *  surrounding `loading.tsx` announces the pending state instead. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("bg-muted animate-pulse rounded-lg", className)}
      {...props}
    />
  );
}

export { Skeleton };
