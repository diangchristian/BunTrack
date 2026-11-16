import { formatQuantity } from "./costing";
import type { InventoryItem, MovementType, RecipeLine } from "./types";

// Stock rules as pure functions: what a movement does to an item, and what a sale needs.
// The actions apply the result in a database transaction.

export type MovementInput = {
  type: Exclude<MovementType, "sale">;
  itemId: string;
  /** Small unit. Stock In: amount received. Adjustment: amount counted. Waste: amount thrown away. */
  quantity: number;
  unitCost?: number;
  reference?: string;
  supplier?: string;
  note?: string;
  date: string;
};

type Plan =
  | { ok: true; change: number; newQuantity: number; unitCost?: number; reference?: string; supplier?: string; note?: string }
  | { ok: false; error: string };

/** What a Stock In, adjustment or waste does to one item: the signed change and the details to record. */
export function planMovement(input: MovementInput, item: Pick<InventoryItem, "quantity" | "unit" | "homemade">): Plan {
  let change: number;
  if (input.type === "stock-in") change = input.quantity;
  else if (input.type === "adjustment") change = input.quantity - item.quantity;
  else if (input.quantity > item.quantity) {
    return { ok: false, error: `Only ${formatQuantity(item.quantity, item.unit)} on hand; you can't waste more than that.` };
  } else change = -input.quantity;

  // A homemade batch is made, not bought: no supplier receipt, and the cost is what it took to make.
  const homemadeBatch = input.type === "stock-in" && item.homemade;
  return {
    ok: true,
    change,
    newQuantity: item.quantity + change,
    // Latest purchase price becomes the unit cost, so every recipe using it is re-costed.
    unitCost: input.type === "stock-in" ? input.unitCost : undefined,
    reference: homemadeBatch ? undefined : input.reference,
    supplier: homemadeBatch ? "Made in-house" : input.supplier,
    note: input.note,
  };
}

/** Item id → amount (small unit) that these sold pieces use, adding up items shared between products. */
export function ingredientsNeeded(pieces: { productId: string; quantity: number }[], recipes: Record<string, RecipeLine[]>) {
  const needed = new Map<string, number>();
  for (const line of pieces) {
    for (const r of recipes[line.productId] ?? []) needed.set(r.itemId, (needed.get(r.itemId) ?? 0) + r.quantity * line.quantity);
  }
  return needed;
}

/** The name of the first item there isn't enough of, or null when the stock covers everything. */
export function findShortage(needed: Map<string, number>, items: Pick<InventoryItem, "id" | "name" | "quantity">[]) {
  for (const [itemId, amount] of needed) {
    const item = items.find((i) => i.id === itemId);
    if ((item?.quantity ?? 0) < amount) return item?.name ?? "a removed item";
  }
  return null;
}
