import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Same column counts as each page's stat-card row, so the cards don't jump when data arrives.
const statColumns = {
  2: "md:grid-cols-2",
  4: "sm:grid-cols-2 xl:grid-cols-4",
  5: "sm:grid-cols-2 xl:grid-cols-5",
  6: "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6",
} as const;

type ContentProps = {
  /** The Business / Period filter row (Reports, Expenses). */
  filters?: boolean;
  stats?: keyof typeof statColumns;
  /** "split": main column + side column (charts, forms). "table": one wide card (lists). */
  body: "split" | "table";
};

/** A page's loading shape: heading, then the content. The layout every (app) page uses. */
export function PageSkeleton(props: ContentProps) {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <ContentSkeleton {...props} />
    </div>
  );
}

/** Everything under the heading, for pages that show their heading before the data (Inventory). */
export function ContentSkeleton({ filters, stats, body }: ContentProps) {
  return (
    <>
      {filters && (
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-64 max-w-full rounded-lg" />
          <Skeleton className="h-9 w-72 max-w-full rounded-lg" />
        </div>
      )}
      {stats && (
        <div className={cn("grid grid-cols-1 gap-4", statColumns[stats])}>
          {Array.from({ length: stats }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}
      {body === "split" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-6">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <div className="flex flex-col gap-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <Skeleton className="h-9 w-full max-w-sm rounded-lg" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      )}
    </>
  );
}

/** The POS: menu (heading, search, category chips, product cards) beside the order column. */
export function PosSkeleton() {
  return (
    <div
      className="flex flex-1 flex-col md:grid md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_400px]"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-11 w-full rounded-lg" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-24 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(max(200px,calc((100%_-_5*0.75rem)/6)),1fr))] gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-[14px]" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4 border-t bg-card p-5 md:sticky md:top-16 md:h-[calc(100svh-4rem)] md:border-t-0 md:border-l">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="mt-auto h-12 rounded-lg" />
      </div>
    </div>
  );
}
