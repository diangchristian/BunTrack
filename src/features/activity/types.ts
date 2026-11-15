export const activityModules = ["POS", "Products", "Inventory", "Costing", "Expenses", "Users", "Settings"] as const;

export type ActivityModule = (typeof activityModules)[number];

/** One important change: who did it, when, and what changed. Entries are never edited or deleted. */
export type ActivityEntry = {
  id: string;
  /** ISO timestamp. */
  at: string;
  user: string;
  module: ActivityModule;
  /** What happened, e.g. "Price updated". */
  action: string;
  /** What it happened to, e.g. "Double Cheeseburger" or "Order #1043". */
  record: string;
  /** Before → after, or a short detail. */
  change?: string;
};
