/**
 * Stock is stored in the smallest unit as whole numbers (g, ml, pc) so repeated
 * deductions like 15 g of lettuce never drift. Costs and the UI use the big unit.
 */
export const units = {
  pcs: { label: "pcs", small: "pc", factor: 1 },
  kg: { label: "kg", small: "g", factor: 1000 },
  L: { label: "L", small: "ml", factor: 1000 },
} as const;

export type UnitId = keyof typeof units;

export const itemCategories = [
  "Bakery",
  "Meat",
  "Dairy",
  "Produce",
  "Condiments",
  "Frozen",
  "Pantry",
  "Drinks",
  "Ice Cream (Dan Eric)",
] as const;

export type ItemCategory = (typeof itemCategories)[number];

export type InventoryItem = {
  id: string;
  name: string;
  category: ItemCategory;
  unit: UnitId;
  /** On hand, in the small unit (g, ml, pc). */
  quantity: number;
  /** Reorder point, in the small unit. */
  minimum: number;
  /** Centavos per big unit (per kg, per L, per pc). Latest purchase price. */
  unitCost: number;
};

/** How much of one inventory item a single serving uses, in the item's small unit. */
export type RecipeLine = { itemId: string; quantity: number };

export type MovementType = "stock-in" | "adjustment" | "waste" | "sale";

export type StockMovement = {
  id: string;
  itemId: string;
  type: MovementType;
  /** Signed change in the small unit: +5000 for 5 kg received, −15 for 15 g sold. */
  change: number;
  /** Stock In only: centavos per big unit paid. */
  unitCost?: number;
  /** Stock In: invoice no. Sale: order no. */
  reference?: string;
  supplier?: string;
  /** Adjustment / waste reason. */
  note?: string;
  /** YYYY-MM-DD the stock moved (date received for Stock In). */
  date: string;
  by: string;
  createdAt: string;
};
