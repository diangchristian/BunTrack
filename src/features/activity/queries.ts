import "server-only";

import { connection } from "next/server";

import { db } from "@/lib/db";
import type { ActivityEntry, ActivityModule } from "./types";

/** The newest entries, newest first, with who did each. */
export async function listActivity(): Promise<ActivityEntry[]> {
  await connection(); // always the latest entries
  // shortcut: newest 500 only, filtered in the browser; filter and page on the server when the log outgrows it.
  const rows = await db.activityEntry.findMany({ orderBy: { at: "desc" }, take: 500, include: { user: { select: { name: true } } } });
  return rows.map((e) => ({
    id: e.id,
    at: e.at.toISOString(),
    user: e.user.name,
    // Always one of activityModules: only the app's own actions write here.
    module: e.module as ActivityModule,
    action: e.action,
    record: e.record,
    ...(e.change && { change: e.change }),
  }));
}
