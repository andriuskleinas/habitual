import { Skeleton } from "@/components/ui/skeleton";

/** Same shapes as the page: heading, summary strip, a list of rows. */
export default function DashboardLoading() {
  return (
    <main
      className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14"
      aria-busy="true"
      aria-label="Loading your dashboard"
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-12 w-64 max-w-full" />
      <Skeleton className="mt-3 h-5 w-72 max-w-full" />

      <Skeleton className="mt-8 h-[150px] rounded-3xl" />

      <Skeleton className="mt-12 h-6 w-36" />
      <Skeleton className="mt-3 h-[260px] rounded-3xl" />
    </main>
  );
}
