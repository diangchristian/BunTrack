import { Skeleton } from "@/components/ui/skeleton";

// Shown while a page waits on request-time data (products, menu).
export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
