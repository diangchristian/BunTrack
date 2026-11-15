import { manilaDate } from "@/lib/format";
import type { ExpenseFormValues } from "./schemas";
import type { Expense } from "./types";

export function createExpenseStore(seed: Expense[]) {
  let expenses = [...seed];

  return {
    list: () => expenses,

    add(values: ExpenseFormValues, recordedBy: string): Expense {
      const expense = { id: crypto.randomUUID(), ...values, recordedBy };
      expenses = [...expenses, expense];
      return expense;
    },

    /** Edits keep the original recorder; a corrected sample expense counts as real from then on. */
    update(id: string, values: ExpenseFormValues) {
      if (!expenses.some((e) => e.id === id)) return false;
      expenses = expenses.map((e) => (e.id === id ? { ...e, ...values, sample: undefined } : e));
      return true;
    },

    remove(id: string) {
      const before = expenses.length;
      expenses = expenses.filter((e) => e.id !== id);
      return expenses.length < before;
    },
  };
}

// shortcut: expenses live in server memory and reset when the server restarts. Replace with
// an expenses table once the database exists.
/** ~45 days of demo expenses based on what the shop really pays, marked `sample`. */
function sampleExpenses(today: string): Expense[] {
  const day = (back: number) => new Date(Date.parse(`${today}T00:00:00Z`) - back * 86_400_000).toISOString().slice(0, 10);
  const list: Omit<Expense, "id" | "recordedBy" | "sample">[] = [];
  for (let back = 44; back >= 0; back--) {
    const date = day(back);
    const dom = Number(date.slice(8));
    if (dom === 1) list.push({ date, category: "Electricity", business: "iceCream", amount: 50000, paidVia: "cash", description: "Freezer electricity share" });
    if (dom === 5) list.push({ date, category: "Water", business: "shared", amount: 120000, paidVia: "gcash", description: "Water bill" });
    if (dom === 14) list.push({ date, category: "Electricity", business: "shared", amount: 320000, paidVia: "gcash", description: "Electricity bill" });
    if (back % 10 === 3) list.push({ date, category: "LPG / Cooking gas", business: "burger", amount: 110000, paidVia: "cash", description: "LPG refill (11 kg)" });
    if (back % 4 === 1) list.push({ date, category: "Transportation", business: "burger", amount: 15000, paidVia: "cash", description: "Tricycle to the market" });
    if (back % 12 === 6) list.push({ date, category: "Delivery & shipping", business: "iceCream", amount: 5000, paidVia: "cash", description: "Dan Eric delivery fee" });
    if (back % 15 === 9) list.push({ date, category: "Delivery & shipping", business: "burger", amount: 12000, paidVia: "gcash", description: "Shipping for burger sauce (online)" });
    if (back % 7 === 2) list.push({ date, category: "Packaging & supplies", business: "burger", amount: 18000, paidVia: "cash", description: "Paper bags and tissue" });
  }
  return list.map((e, i) => ({ ...e, id: `sample-${i}`, recordedBy: "Maria Reyes", sample: true }));
}

// Kept on globalThis so dev hot-reloads don't wipe expenses (same trick as lib/db.ts).
const globalForStore = globalThis as unknown as { expenseStore?: ReturnType<typeof createExpenseStore> };
export const expenseStore = (globalForStore.expenseStore ??= createExpenseStore(sampleExpenses(manilaDate())));
