export const categories = [
  { id: "burgers", label: "Burgers" },
  { id: "combos", label: "Combo Meals" },
  { id: "sides", label: "Sides" },
  { id: "drinks", label: "Drinks" },
  { id: "iceCream", label: "Ice Cream" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export type MenuProduct = {
  id: string;
  name: string;
  category: CategoryId;
  /** Centavos. */
  price: number;
  /** Path under /public, e.g. "/products/classic-cheeseburger.jpg". Falls back to a category icon. */
  image?: string;
  available: boolean;
  unavailableReason?: string;
};

export type OrderType = "dine-in" | "takeout";
export type PaymentMethod = "cash" | "gcash";

export type Receipt = {
  orderNumber: string;
  completedAt: string;
  orderType: OrderType;
  method: PaymentMethod;
  lines: { productId: string; name: string; quantity: number; lineTotal: number }[];
  total: number;
  received: number;
  change: number;
};
