import Link from "next/link";

import { cn } from "@/lib/utils";

/** A row of filter links (period, business). The choice lives in the URL, so it survives reloads and can be bookmarked. */
export function SegmentedLinks({ label, options, active }: { label: string; options: { id: string; label: string; href: string }[]; active: string }) {
  return (
    <nav aria-label={label} className="flex gap-1 rounded-[10px] border bg-secondary p-1">
      {options.map((o) => (
        <Link
          key={o.id}
          href={o.href}
          aria-current={o.id === active ? "page" : undefined}
          className={cn(
            "flex h-8 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground",
            o.id === active && "bg-background font-semibold text-foreground shadow-sm",
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
