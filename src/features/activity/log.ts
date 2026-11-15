import "server-only";

import { getCurrentUser } from "@/features/auth/queries";
import { activityStore } from "./store";
import type { ActivityEntry } from "./types";

/** Records who did what, after a change succeeds. Call it from server actions only. */
export async function logActivity(entry: Omit<ActivityEntry, "id" | "at" | "user">) {
  activityStore.log({ ...entry, user: (await getCurrentUser()).name });
}
