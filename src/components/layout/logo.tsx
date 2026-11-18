/** The BunTrack mark: a ☰ menu icon whose top line is a bun. Drawn in currentColor. */
function BunTrackMark({ className }: { className?: string }) {
  return (
    <svg viewBox="32 24 192 192" fill="currentColor" className={className} aria-hidden>
      <path d="M40 102V94a88 64 0 0 1 176 0v8a12 12 0 0 1-12 12H52a12 12 0 0 1-12-12Z" />
      <rect x="40" y="134" width="176" height="28" rx="14" />
      <rect x="40" y="182" width="176" height="28" rx="14" />
    </svg>
  );
}

export function Logo({ caption = "Burger Shop Manager" }: { caption?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <BunTrackMark className="size-6" />
      </div>
      {/* Hidden when the app sidebar is collapsed to icons; no effect elsewhere. */}
      <div className="leading-tight whitespace-nowrap group-data-[collapsible=icon]:hidden">
        <p className="font-heading text-lg font-bold text-foreground">BunTrack</p>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}
