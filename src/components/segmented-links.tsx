import Link from "next/link";

import { cn } from "@/lib/utils";

/** A row of filter links (period, business). The choice lives in the URL, so it survives reloads and can be bookmarked. */
export function SegmentedLinks({ label, options, active }: { label: string; options: { id: string; label: string; href: string }[]; active: string }) {
  return (
    // Smaller text on phones (like the sort toggles); scrolls sideways if it still doesn't fit.
    <nav aria-label={label} className="flex max-w-full gap-1 overflow-x-auto rounded-[10px] border bg-secondary p-1">
      {options.map((o) => (
        <Link
          key={o.id}
          href={o.href}
          aria-current={o.id === active ? "page" : undefined}
          className={cn(
            "flex h-8 shrink-0 items-center rounded-md px-2.5 text-xs font-medium whitespace-nowrap sm:px-3 sm:text-sm text-muted-foreground hover:text-foreground",
            o.id === active && "bg-background font-semibold text-foreground shadow-sm",
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
