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
  /** Production cost per serving in centavos. Entered by hand until recipes come from Inventory. */
  cost: number;
  /** Path under /public, e.g. "/products/ube-sundae.jpg". Falls back to a category icon. */
  image?: string;
  available: boolean;
  unavailableReason?: string;
};
