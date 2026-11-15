import type { CategoryId } from "@/features/products/types";

export type Business = "burger" | "iceCream";

export const businesses = [
  { id: "all", label: "All" },
  { id: "burger", label: "Burger Shop" },
  { id: "iceCream", label: "Ice Cream" },
] as const;

export type BusinessFilter = (typeof businesses)[number]["id"];

/** Dan Eric ice cream is its own business; everything else is the burger shop. */
export const businessOf = (category: CategoryId): Business => (category === "iceCream" ? "iceCream" : "burger");

/**
 * A completed sale. Each line keeps the price and cost at the time of sale, so later
 * price or recipe changes never rewrite past revenue and profit.
 */
export type Order = {
  number: string;
  /** ISO timestamp. */
  completedAt: string;
  /** YYYY-MM-DD in Manila, for grouping by day. */
  date: string;
  cashier: string;
  method: "cash" | "gcash";
  lines: {
    productId: string;
    name: string;
    category: CategoryId;
    quantity: number;
    /** Centavos per order unit, as charged. */
    unitPrice: number;
    /** Centavos per order unit (recipe × pieces), at the time of sale. */
    unitCost: number;
  }[];
  /** Seeded demo data, not a real sale. */
  sample?: boolean;
};

export const periods = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "month", label: "This month" },
] as const;

export type PeriodId = (typeof periods)[number]["id"];
