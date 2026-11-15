export const categories = [
  { id: "burgers", label: "Burgers" },
  { id: "combos", label: "Combo Meals" },
  { id: "sides", label: "Sides" },
  { id: "drinks", label: "Drinks" },
  { id: "iceCream", label: "Ice Cream" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export const categoryLabel = (id: CategoryId) => categories.find((c) => c.id === id)!.label;

export type Product = {
  id: string;
  name: string;
  description: string;
  category: CategoryId;
  /** Selling price in centavos. */
  price: number;
  /** Path under /public, e.g. "/products/pint.jpg". Falls back to a category icon. */
  image?: string;
  /** Switched on for sale by the owner. Sold-out is worked out from stock, not stored. */
  available: boolean;
};

/** A product with its cost and stock worked out from its recipe and current Inventory. */
export type CostedProduct = Product & {
  /** Production cost per serving (centavos); for Dan Eric ice cream, the dealer price. */
  cost: number;
  hasRecipe: boolean;
  /** Servings the stock can still make; null when there's no recipe to track. */
  servingsLeft: number | null;
  /** Name of the inventory item that runs out first, e.g. "Onions" or "Pint". */
  limitedBy?: string;
};

/** Why a product can't be sold right now, or undefined if it can. Used by the POS and Products. */
export function unavailableReason(p: Pick<CostedProduct, "available" | "servingsLeft" | "limitedBy" | "category">) {
  if (!p.available) return "Switched off";
  // Dan Eric items run out of themselves; made items name the missing ingredient.
  if (p.servingsLeft === 0) return p.category === "iceCream" ? "Sold out" : `Out of ${p.limitedBy}`;
  return undefined;
}

/** On the POS right now: switched on, and not out of an ingredient. */
export const isOnSale = (p: Pick<CostedProduct, "available" | "servingsLeft">) => p.available && p.servingsLeft !== 0;
