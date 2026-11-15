import "server-only";

import { connection } from "next/server";

import { recipeCost, servingsLeft } from "@/features/inventory/costing";
import { inventoryStore } from "@/features/inventory/store";
import { productStore } from "./store";
import type { CostedProduct } from "./types";

/**
 * All products with cost and servings left worked out from their recipes and current
 * Inventory. Read at request time so stock and price changes show up immediately.
 */
export async function getProducts(): Promise<CostedProduct[]> {
  await connection();
  const items = inventoryStore.items();
  return productStore.list().map((product) => {
    const recipe = inventoryStore.recipe(product.id);
    const left = servingsLeft(recipe, items);
    return {
      ...product,
      cost: recipeCost(recipe, items),
      hasRecipe: recipe.length > 0,
      servingsLeft: left?.servings ?? null,
      limitedBy: left?.limitedBy,
    };
  });
}
