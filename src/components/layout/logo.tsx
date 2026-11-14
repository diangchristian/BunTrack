import { Hamburger } from "lucide-react";

export function Logo({ caption = "Burger Shop Manager" }: { caption?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Hamburger className="size-6" aria-hidden />
      </div>
      {/* Hidden when the app sidebar is collapsed to icons; no effect elsewhere. */}
      <div className="leading-tight whitespace-nowrap group-data-[collapsible=icon]:hidden">
        <p className="font-heading text-lg font-bold text-foreground">BunTrack</p>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}
