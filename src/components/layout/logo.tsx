import { Hamburger } from "lucide-react";

export function Logo({ caption = "Burger Shop Manager" }: { caption?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Hamburger className="size-6" aria-hidden />
      </div>
      <div className="leading-tight">
        <p className="text-lg font-bold text-foreground">BunTrack</p>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}
