import { CalendarDays } from "lucide-react";

import { LiveClock } from "@/components/layout/live-clock";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-8">
      <SidebarTrigger className="-ml-1" />
      <span className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium text-muted-foreground">
        <CalendarDays className="size-4" aria-hidden />
        <LiveClock />
      </span>
    </header>
  );
}
