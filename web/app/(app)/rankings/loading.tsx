import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for the rankings table: header + toolbar + row skeletons. */
export default function RankingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-11 w-full" />
      <div>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <Skeleton className="h-8 w-full sm:w-56" />
          <Skeleton className="h-8 w-full sm:w-44" />
          <Skeleton className="h-8 w-full sm:w-44" />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card/60 p-2">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
