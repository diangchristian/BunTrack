export const categories = [
  { id: "burgers", label: "Burgers" },
  { id: "combos", label: "Combo Meals" },
  { id: "sides", label: "Sides" },
  { id: "drinks", label: "Drinks" },
  { id: "iceCream", label: "Ice Cream" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export const categoryLabel = (id: CategoryId) => categories.find((c) => c.id === id)!.label;

/** A unit-counted item (ice cream) with nothing left to sell. */
export const isSoldOut = (p: Pick<Product, "stock">) => p.stock !== null && p.stock <= 0;

/** On the POS right now: switched on, and not sold out. */
export const isOnSale = (p: Pick<Product, "stock" | "available">) => p.available && !isSoldOut(p);

export type Product = {
  id: string;
  name: string;
  description: string;
  category: CategoryId;
  /** Selling price in centavos. */
  price: number;
  /**
   * Cost per unit in centavos. Made items (burgers): production cost, typed in until
   * recipes come from Inventory. Resold items (Dan Eric ice cream): the dealer price.
   */
  cost: number;
  /** Units on hand for resold items (ice cream); null for made items, which aren't counted by unit. */
  stock: number | null;
  /** Path under /public, e.g. "/products/pint.jpg". Falls back to a category icon. */
  image?: string;
  available: boolean;
  unavailableReason?: string;
};
