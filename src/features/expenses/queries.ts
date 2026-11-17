import "server-only";

import { connection } from "next/server";

import { listCatalog, listOrders } from "@/features/sales/queries";
import { buildReport, periodRange } from "@/features/sales/report";
import type { BusinessFilter, PeriodId } from "@/features/sales/types";
import { fromDbDate, toDbDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { manilaDate } from "@/lib/format";
import { summarizeExpenses } from "./summary";
import type { Expense, ExpenseCategory } from "./types";

/** Expenses for the period plus the sales numbers needed for the net profit estimate. */
export async function getExpensesPage(period: PeriodId, business: BusinessFilter) {
  await connection();
  const today = manilaDate();
  const range = periodRange(period, today);

  const [rows, orders, catalog] = await Promise.all([
    // From the start of the previous period: the summary compares the two.
    db.expense.findMany({
      where: { date: { gte: toDbDate(range.prevFrom), lte: toDbDate(range.to) } },
      include: { recordedBy: { select: { name: true } } },
    }),
    listOrders(range),
    listCatalog(),
  ]);

  const expenses: Expense[] = rows.map((e) => ({
    id: e.id,
    date: fromDbDate(e.date),
    // Checked against expenseCategories (zod) when an expense is saved.
    category: e.category as ExpenseCategory,
    business: e.business,
    description: e.description,
    amount: e.amount,
    paidVia: e.paidVia,
    recordedBy: e.recordedBy.name,
  }));
  const { kpis } = buildReport(orders, range, business, catalog);

  return {
    range,
    summary: summarizeExpenses(expenses, range, business, today),
    revenue: kpis.revenue,
    costOfGoodsSold: kpis.revenue - kpis.profit,
  };
}
