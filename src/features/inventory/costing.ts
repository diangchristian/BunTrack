import { units, type InventoryItem, type RecipeLine } from "./types";

/** Cost of one line in centavos (unrounded): small-unit quantity × price per big unit. */
export function lineCost(line: RecipeLine, item: InventoryItem) {
  return (line.quantity * item.unitCost) / units[item.unit].factor;
}

/** Production cost of one serving in centavos, priced at current unit costs. */
export function recipeCost(recipe: RecipeLine[], items: InventoryItem[]) {
  return Math.round(
    recipe.reduce((sum, line) => {
      const item = items.find((i) => i.id === line.itemId);
      return item ? sum + lineCost(line, item) : sum;
    }, 0),
  );
}

/**
 * How many servings the current stock can still make, and the item that runs out first
 * (by name, e.g. "Onions"). null = no recipe, so the product isn't stock-tracked.
 */
export function servingsLeft(recipe: RecipeLine[], items: InventoryItem[]) {
  if (recipe.length === 0) return null;
  let best = { servings: Infinity, limitedBy: "" };
  for (const line of recipe) {
    const item = items.find((i) => i.id === line.itemId);
    const servings = item ? Math.floor(item.quantity / line.quantity) : 0;
    if (servings < best.servings) best = { servings, limitedBy: item?.name ?? "a removed item" };
  }
  return best;
}

/** Selling price (centavos) that gives the target gross margin: cost ÷ (1 − margin). */
export function suggestedPrice(cost: number, targetMarginPercent: number) {
  return Math.round(cost / (1 - targetMarginPercent / 100));
}

/** Rounds up to the next whole-peso price ending in 9 (₱166.86 → ₱169). */
export function roundForMenu(price: number) {
  return Math.ceil((price - 900) / 1000) * 1000 + 900;
}

export type StockStatus = "out" | "low" | "in";

export function stockStatus(item: Pick<InventoryItem, "quantity" | "minimum">): StockStatus {
  if (item.quantity <= 0) return "out";
  return item.quantity < item.minimum ? "low" : "in";
}

/** "0.6 kg" for stock levels; "15 g" / "1 pc" for per-serving amounts. */
export function formatQuantity(quantity: number, unit: InventoryItem["unit"], mode: "stock" | "serving" = "stock") {
  const u = units[unit];
  if (unit === "pcs") return `${quantity} ${quantity === 1 ? "pc" : "pcs"}`;
  if (mode === "serving") return `${quantity} ${u.small}`;
  return `${Number((quantity / u.factor).toFixed(2))} ${u.label}`;
}

/** Value of what's on hand, in centavos (unrounded), at the current unit cost. */
export function stockValue(item: Pick<InventoryItem, "quantity" | "unitCost" | "unit">) {
  return (item.quantity * item.unitCost) / units[item.unit].factor;
}

/** What one pc / kg / L cost, in centavos, from the total paid for `quantity` small units (pc, g, ml). */
export function costFromPurchase(totalPaid: number, quantity: number, unit: InventoryItem["unit"]) {
  return Math.round((totalPaid * units[unit].factor) / quantity);
}

/** "pc" / "kg" / "L": the word after "per", as in "₱15.00 per pc". */
export const perUnitLabel = (unit: InventoryItem["unit"]) => (unit === "pcs" ? "pc" : units[unit].label);
