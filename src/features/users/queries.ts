import "server-only";

import { db } from "@/lib/db";
import { parseRole } from "./schemas";
import type { User } from "./types";

/** Every account, oldest first. A family shop has a handful, so the rules check the whole list. */
export async function listUsers(): Promise<User[]> {
  const rows = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return rows.map((row) => ({ ...row, role: parseRole(row.role) }));
}
