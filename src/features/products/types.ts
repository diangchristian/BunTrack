import { ICE_CREAM } from "@/features/categories/types";

/** A category id from Settings → Product categories (e.g. "burgers", "iceCream"). */
export type CategoryId = string;

export type Product = {
  id: string;
  name: string;
  description: string;
  category: CategoryId;
  /** Selling price in centavos, per order. */
  price: number;
  /** Pieces handed out per order: 1 normally, 2 for Buy 1 Take 1. The recipe is per piece. */
  pieces: number;
  /** Uploaded photo (data URL, resized to ~512px) or a path under /public. Falls back to a category icon. */
  image?: string;
  /** Switched on for sale by the owner. Sold-out is worked out from stock, not stored. */
  available: boolean;
};

/** A product with its cost and stock worked out from its recipe and current Inventory. */
export type CostedProduct = Product & {
  /** Cost per order (centavos): recipe × pieces. For Dan Eric ice cream, the dealer price. */
  cost: number;
  hasRecipe: boolean;
  /** Orders the stock can still make; null when there's no recipe to track. */
  servingsLeft: number | null;
  /** Name of the inventory item that runs out first, e.g. "Onions" or "Pint". */
  limitedBy?: string;
};

/** Why a product can't be sold right now, or undefined if it can. Used by the POS and Products. */
export function unavailableReason(p: Pick<CostedProduct, "available" | "servingsLeft" | "limitedBy" | "category">) {
  if (!p.available) return "Switched off";
  // Dan Eric items run out of themselves; made items name the missing ingredient.
  if (p.servingsLeft === 0) return p.category === ICE_CREAM ? "Sold out" : `Out of ${p.limitedBy}`;
  return undefined;
}

/** On the POS right now: switched on, and not out of an ingredient. */
export const isOnSale = (p: Pick<CostedProduct, "available" | "servingsLeft">) => p.available && p.servingsLeft !== 0;
