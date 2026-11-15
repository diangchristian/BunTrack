import "server-only";

import { connection } from "next/server";

import { productStore } from "@/features/products/store";
import { inventoryStore } from "./store";

/** Items, movement history and which products use each item, read at request time. */
export async function getInventory() {
  await connection();
  const items = inventoryStore.items();
  const recipes = inventoryStore.recipes();
  const products = productStore.list();

  // itemId → names of the products whose recipe uses it (for "blocks Onion Rings" / re-costing notes)
  const usedBy: Record<string, string[]> = {};
  for (const product of products) {
    for (const line of recipes[product.id] ?? []) (usedBy[line.itemId] ??= []).push(product.name);
  }

  return { items, movements: inventoryStore.movements(), usedBy, recipes };
}
