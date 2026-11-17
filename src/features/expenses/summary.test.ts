import assert from "node:assert/strict";
import { test } from "vitest";

import { expenseFormSchema } from "./schemas";
import { summarizeExpenses } from "./summary";
import type { Expense } from "./types";

const e = (id: string, date: string, business: Expense["business"], category: Expense["category"], amount: number): Expense => ({
  id, date, business, category, amount, description: "", paidVia: "cash", recordedBy: "Maria Reyes",
});
const expenses = [
  e("1", "2026-11-14", "shared", "Electricity", 320000),
  e("2", "2026-11-14", "iceCream", "Electricity", 50000), // freezer share
  e("3", "2026-11-12", "iceCream", "Delivery & shipping", 5000),
  e("4", "2026-11-10", "burger", "LPG / Cooking gas", 110000),
  e("5", "2026-11-03", "burger", "Transportation", 20000), // previous period
];
const range = { from: "2026-11-10", to: "2026-11-16", prevFrom: "2026-11-03", prevTo: "2026-11-09" };

test("All counts every expense in the period, including shared bills", () => {
  const s = summarizeExpenses(expenses, range, "all", "2026-11-14");
  assert.equal(s.total, 485000);
  assert.equal(s.previousTotal, 20000);
  assert.equal(s.today, 370000);
  assert.deepEqual(s.byCategory[0], { category: "Electricity", amount: 370000 });
  assert.deepEqual(s.list.map((x) => x.id), ["1", "2", "3", "4"]); // newest first
});

test("one business counts only its own expenses, never shared bills", () => {
  const s = summarizeExpenses(expenses, range, "iceCream", "2026-11-14");
  assert.equal(s.total, 55000);
  assert.deepEqual(s.byCategory, [
    { category: "Electricity", amount: 50000 },
    { category: "Delivery & shipping", amount: 5000 },
  ]);
  assert.equal(s.sharedLeftOut, 320000);
});

test("the form turns pesos into centavos and needs a category, business and real date", () => {
  const ok = expenseFormSchema.safeParse({
    category: "Delivery & shipping", business: "iceCream", amount: "50", date: "2026-11-12", paidVia: "cash", description: " Dan Eric delivery ",
  });
  assert.ok(ok.success);
  assert.deepEqual([ok.data.amount, ok.data.description], [5000, "Dan Eric delivery"]);

  const bad = expenseFormSchema.safeParse({ category: "Salaries", business: "both", amount: "0", date: "2099-01-01", paidVia: "card", description: "" });
  assert.equal(bad.success, false);
  assert.deepEqual(bad.error!.issues.map((i) => i.path[0]).sort(), ["amount", "business", "category", "date", "paidVia"]);
});
