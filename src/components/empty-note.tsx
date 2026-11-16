import type { ReactNode } from "react";

/** A quiet line for a panel or card with nothing to list yet. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="py-2 text-sm text-muted-foreground">{children}</p>;
}
