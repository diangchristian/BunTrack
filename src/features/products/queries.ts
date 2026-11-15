import "server-only";

import { connection } from "next/server";

import { inventoryStore } from "@/features/inventory/store";
import { costProduct } from "./costing";
import { productStore } from "./store";
import type { CostedProduct } from "./types";

/**
 * All products with cost and servings left worked out from their recipes and current
 * Inventory. Read at request time so stock and price changes show up immediately.
 */
export async function getProducts(): Promise<CostedProduct[]> {
  await connection();
  const items = inventoryStore.items();
  return productStore.list().map((product) => ({
    ...product,
    ...costProduct(product, inventoryStore.recipe(product.id), items),
  }));
}
