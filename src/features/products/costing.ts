import { recipeCost, servingsLeft } from "@/features/inventory/costing";
import type { InventoryItem, RecipeLine } from "@/features/inventory/types";
import type { Product } from "./types";

const toOneDecimal = (n: number) => Math.round(n * 10) / 10;

/** Profit per serving and margins. Price and cost are centavos; percentages have one decimal. */
export function productMargin(price: number, cost: number) {
  const profit = price - cost;
  return {
    profit,
    marginPercent: toOneDecimal((profit / price) * 100),
    foodCostPercent: toOneDecimal((cost / price) * 100),
  };
}

/** Cost per order and orders left, from the per-piece recipe and current Inventory. */
export function costProduct(product: Pick<Product, "pieces">, recipe: RecipeLine[], items: InventoryItem[]) {
  const left = servingsLeft(recipe, items);
  return {
    cost: recipeCost(recipe, items) * product.pieces,
    hasRecipe: recipe.length > 0,
    servingsLeft: left ? Math.floor(left.servings / product.pieces) : null,
    limitedBy: left?.limitedBy,
  };
}
