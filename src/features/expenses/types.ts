/**
 * Operating costs only. Ingredients and Dan Eric stock are recorded with Stock In and
 * counted as cost of goods sold when they sell, so they never belong here.
 * No salaries, rent, marketing or maintenance: a family-run shop with none of those.
 */
export const expenseCategories = [
  "Electricity",
  "Water",
  "LPG / Cooking gas",
  "Transportation",
  "Delivery & shipping",
  "Packaging & supplies",
  "Permits & fees",
  "Other",
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];

/** Shared = one bill for both businesses (e.g. electricity); only counted under "All". */
export const expenseBusinesses = [
  { id: "burger", label: "Burger Shop" },
  { id: "iceCream", label: "Ice Cream" },
  { id: "shared", label: "Shared" },
] as const;

export type ExpenseBusiness = (typeof expenseBusinesses)[number]["id"];

export type Expense = {
  id: string;
  /** YYYY-MM-DD the expense was paid. */
  date: string;
  category: ExpenseCategory;
  business: ExpenseBusiness;
  description: string;
  /** Centavos. */
  amount: number;
  paidVia: "cash" | "gcash";
  recordedBy: string;
};
