import type { BusinessFilter } from "@/features/sales/types";
import type { Range } from "@/features/sales/report";
import type { Expense, ExpenseCategory } from "./types";

const inRange = (e: Expense, from: string, to: string) => e.date >= from && e.date <= to;
const sum = (list: Expense[]) => list.reduce((total, e) => total + e.amount, 0);

/**
 * Expense totals for a period and business. A single business never includes Shared
 * bills (they're reported as `sharedLeftOut`), so its net profit isn't based on a guessed split.
 */
export function summarizeExpenses(expenses: Expense[], range: Range, business: BusinessFilter, today: string) {
  const matches = (e: Expense) => business === "all" || e.business === business;
  const list = expenses
    .filter((e) => inRange(e, range.from, range.to) && matches(e))
    .sort((a, b) => b.date.localeCompare(a.date));

  const byCategory = new Map<ExpenseCategory, number>();
  for (const e of list) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);

  return {
    total: sum(list),
    previousTotal: sum(expenses.filter((e) => inRange(e, range.prevFrom, range.prevTo) && matches(e))),
    today: sum(list.filter((e) => e.date === today)),
    byCategory: [...byCategory].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    list,
    sharedLeftOut: business === "all" ? 0 : sum(expenses.filter((e) => inRange(e, range.from, range.to) && e.business === "shared")),
  };
}
