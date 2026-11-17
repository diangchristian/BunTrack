import "server-only";

import { getCurrentUser } from "@/features/auth/queries";
import { db } from "@/lib/db";
import type { ActivityEntry } from "./types";

/** Records who did what, after a change succeeds. Call it from server actions only. */
export async function logActivity(entry: Omit<ActivityEntry, "id" | "at" | "user">) {
  const user = await getCurrentUser();
  await db.activityEntry.create({ data: { ...entry, userId: user.id } });
}
