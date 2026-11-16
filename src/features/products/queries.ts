import "server-only";

import { connection } from "next/server";

import { listInventoryItems, listRecipes } from "@/features/inventory/queries";
import { db } from "@/lib/db";
import { costProduct } from "./costing";
import type { CostedProduct } from "./types";

/**
 * All active products with cost and servings left worked out from their recipes and current
 * Inventory. Read at request time so stock and price changes show up immediately.
 */
export async function getProducts(): Promise<CostedProduct[]> {
  await connection();
  const [rows, items, recipes] = await Promise.all([
    db.product.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, description: true, categoryId: true, price: true, pieces: true, image: true, available: true },
    }),
    listInventoryItems(),
    listRecipes(),
  ]);
  return rows.map(({ categoryId, image, ...product }) => ({
    ...product,
    category: categoryId,
    ...(image && { image }),
    ...costProduct(product, recipes[product.id] ?? [], items),
  }));
}
