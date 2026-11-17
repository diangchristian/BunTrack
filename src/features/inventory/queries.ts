import "server-only";

import { cache } from "react";
import { connection } from "next/server";

import type { MovementType as DbMovementType } from "@/generated/prisma/client";
import { fromDbDate as asDay, orderLabel } from "@/lib/dates";
import { db } from "@/lib/db";
import { DAN_ERIC, type InventoryItem, type ItemCategory, type MovementType, type RecipeLine, type StockMovement } from "./types";

// Prisma's enum names can't contain "-", so the database "stock-in" is `stock_in` in code.
export const movementTypeToDb = { "stock-in": "stock_in", adjustment: "adjustment", waste: "waste", sale: "sale" } as const satisfies Record<
  MovementType,
  DbMovementType
>;
const movementTypeFromDb: Record<DbMovementType, MovementType> = { stock_in: "stock-in", adjustment: "adjustment", waste: "waste", sale: "sale" };


/** A database item row as the app's InventoryItem. */
export function toInventoryItem(row: {
  id: string;
  name: string;
  category: string;
  unit: InventoryItem["unit"];
  quantity: number;
  minimum: number;
  unitCost: number;
  packSize: number | null;
  homemade: boolean;
}): InventoryItem {
  const { id, name, unit, quantity, minimum, unitCost } = row;
  return {
    id,
    name,
    // Checked against itemCategories (zod) whenever an item is saved.
    category: row.category as ItemCategory,
    unit,
    quantity,
    minimum,
    unitCost,
    ...(row.packSize !== null && { packSize: row.packSize }),
    ...(row.homemade && { homemade: true }),
  };
}

/** Active (not archived) items, alphabetically. cache(): read once per page render. */
export const listInventoryItems = cache(async () => {
  await connection(); // a database read: at request time, never while prerendering the build
  const rows = await db.inventoryItem.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } });
  return rows.map(toInventoryItem);
});

/** productId → its recipe, for every product that has one. */
export const listRecipes = cache(async () => {
  await connection();
  const lines = await db.recipeLine.findMany({ select: { productId: true, itemId: true, quantity: true } });
  const recipes: Record<string, RecipeLine[]> = {};
  for (const { productId, itemId, quantity } of lines) (recipes[productId] ??= []).push({ itemId, quantity });
  return recipes;
});

// shortcut: the history shows the latest 500 movements; add date filters or paging on the server
// when a shop's history outgrows that.
const HISTORY_LIMIT = 500;

/** Items, movement history and which products use each item, read at request time. */
export async function getInventory() {
  await connection();
  const [items, recipes, products, rows] = await Promise.all([
    listInventoryItems(),
    listRecipes(),
    db.product.findMany({ where: { archivedAt: null }, select: { id: true, name: true, price: true } }),
    db.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
      include: { recordedBy: { select: { name: true } }, order: { select: { number: true } } },
    }),
  ]);

  // itemId → names of the products whose recipe uses it (for "blocks Onion Rings" / re-costing notes)
  const usedBy: Record<string, string[]> = {};
  for (const product of products) {
    for (const line of recipes[product.id] ?? []) (usedBy[line.itemId] ??= []).push(product.name);
  }

  const movements: StockMovement[] = rows.map((m) => ({
    id: m.id,
    itemId: m.itemId,
    type: movementTypeFromDb[m.type],
    change: m.change,
    ...(m.unitCost !== null && { unitCost: m.unitCost }),
    // A sale's reference is its order number.
    ...((m.order || m.reference) && { reference: m.order ? orderLabel(m.order.number) : m.reference! }),
    ...(m.supplier && { supplier: m.supplier }),
    ...(m.note && { note: m.note }),
    date: asDay(m.date),
    by: m.recordedBy.name,
    createdAt: m.createdAt.toISOString(),
  }));

  // A Dan Eric item's selling price is its product's price (one piece per sale), for "expected sale".
  const sellsFor: Record<string, number> = {};
  for (const product of products) {
    const [line, ...more] = recipes[product.id] ?? [];
    const item = line && !more.length && line.quantity === 1 && items.find((i) => i.id === line.itemId);
    if (item && item.category === DAN_ERIC) sellsFor[item.id] = product.price;
  }

  return { items, movements, usedBy, recipes, sellsFor };
}
