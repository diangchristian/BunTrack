import "server-only";

import { cache } from "react";
import { connection } from "next/server";

import { db } from "@/lib/db";
import type { Category } from "./types";

/**
 * Menu categories in the owner's order (POS buttons, filters). cache() reads them once per page
 * render, since the layout, the page and its parts may each ask.
 */
export const listCategories = cache(async (): Promise<Category[]> => {
  await connection(); // a database read: at request time, never while prerendering the build
  return db.category.findMany({ orderBy: { position: "asc" }, select: { id: true, label: true } });
});

/** categoryId → how many active and archived products use it (Settings shows it and blocks deletes). */
export async function productCountsByCategory() {
  await connection();
  const rows = await db.product.groupBy({ by: ["categoryId", "archivedAt"], _count: true });
  const counts: Record<string, { active: number; archived: number }> = {};
  for (const r of rows) {
    const c = (counts[r.categoryId] ??= { active: 0, archived: 0 });
    if (r.archivedAt) c.archived += r._count;
    else c.active += r._count;
  }
  return counts;
}
