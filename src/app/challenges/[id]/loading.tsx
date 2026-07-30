import { Skeleton } from "@/components/ui/skeleton";

export default function ChallengeLoading() {
  return (
    <main
      className="mx-auto w-full max-w-5xl flex-1 px-5 py-6 sm:px-8 sm:py-10"
      aria-busy="true"
      aria-label="Loading challenge"
    >
      <Skeleton className="h-5 w-24" />
      <Skeleton className="mt-6 h-4 w-40" />
      <Skeleton className="mt-2 h-9 w-72 max-w-full" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[104px] rounded-2xl" />
          <Skeleton className="h-[86px] rounded-2xl" />
          <Skeleton className="mt-5 h-[220px] rounded-2xl" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-[320px] rounded-xl" />
        </div>
      </div>
    </main>
  );
}
