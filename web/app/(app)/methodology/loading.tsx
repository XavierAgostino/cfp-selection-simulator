import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for the methodology page: heading plus stacked prose blocks. */
export default function MethodologyLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section} className="flex flex-col gap-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}
