import type { ActivityEntry, ActivityModule } from "./types";

/** The Activity Logs page's search and filters, run in the browser on the entries it was sent. */
export function filterActivity(
  entries: ActivityEntry[],
  { query = "", user, module, since }: { query?: string; user?: string; module?: ActivityModule; since?: string },
) {
  const q = query.trim().toLowerCase();
  return entries.filter(
    (e) =>
      (!user || e.user === user) &&
      (!module || e.module === module) &&
      (!since || e.at >= new Date(since).toISOString()) &&
      (!q || `${e.action} ${e.record} ${e.change ?? ""} ${e.user}`.toLowerCase().includes(q)),
  );
}
