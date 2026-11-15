import type { ActivityEntry, ActivityModule } from "./types";

export function createActivityStore() {
  let entries: ActivityEntry[] = []; // newest first

  return {
    list: () => entries,
    /** Append-only: an audit trail is never edited or deleted. */
    log(entry: Omit<ActivityEntry, "id" | "at">, at = new Date()) {
      const logged = { ...entry, id: crypto.randomUUID(), at: at.toISOString() };
      entries = [logged, ...entries];
      // New entries are almost always the newest; only re-sort when one is back-dated (tests).
      if (entries[1] && entries[1].at > logged.at) entries.sort((a, b) => b.at.localeCompare(a.at));
    },
  };
}

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

// shortcut: the log lives in server memory and resets when the server restarts. Replace with an
// append-only activity_logs table (written in the same transaction as each change) later.
const globalForStore = globalThis as unknown as { activityStore?: ReturnType<typeof createActivityStore> };
export const activityStore = (globalForStore.activityStore ??= createActivityStore());
