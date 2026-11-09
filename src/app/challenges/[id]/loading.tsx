import { Skeleton } from "@/components/ui/skeleton";

/** Same shapes as the page: title, stake line, figures, calendar, sidebar. */
export default function ChallengeLoading() {
  return (
    <main
      className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-12"
      aria-busy="true"
      aria-label="Loading challenge"
    >
      <Skeleton className="h-5 w-24" />
      <Skeleton className="mt-8 h-4 w-56" />
      <Skeleton className="mt-3 h-14 w-96 max-w-full" />
      <Skeleton className="mt-8 h-[76px] rounded-2xl" />

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-12">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-[96px] rounded-2xl" />
          <Skeleton className="h-[300px] rounded-3xl" />
        </div>
        <div className="flex flex-col gap-5">
          <Skeleton className="h-[260px] rounded-3xl" />
        </div>
      </div>
    </main>
  );
}
