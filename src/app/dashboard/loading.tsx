import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main
      className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-12"
      aria-busy="true"
      aria-label="Loading your dashboard"
    >
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-2 h-5 w-72" />

      {/* State-of-play panel, then the stat strip. */}
      <Skeleton className="mt-6 h-[116px] rounded-2xl" />
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Skeleton className="h-[68px] rounded-xl" />
        <Skeleton className="h-[68px] rounded-xl" />
        <Skeleton className="col-span-2 h-[68px] rounded-xl" />
      </div>

      <Skeleton className="mt-10 h-4 w-36" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[172px] rounded-xl" />
        ))}
      </div>
    </main>
  );
}
