import { Suspense } from "react";
import { connection } from "next/server";
import { CalendarDays } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";

async function TodayDate() {
  await connection(); // render at request time, not at build time
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date());
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-8">
      <SidebarTrigger className="-ml-1" />
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-semibold text-success-strong sm:flex">
          <span className="size-2 rounded-full bg-success" aria-hidden />
          Main Branch · Open
        </span>
        <span className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden />
          <Suspense fallback="Today">
            <TodayDate />
          </Suspense>
        </span>
      </div>
    </header>
  );
}
