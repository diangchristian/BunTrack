import "server-only";

import { connection } from "next/server";

import { productStore } from "@/features/products/store";
import { buildReport, periodRange } from "@/features/sales/report";
import { orderStore } from "@/features/sales/store";
import type { BusinessFilter, PeriodId } from "@/features/sales/types";
import { manilaDate } from "@/lib/format";
import { expenseStore } from "./store";
import { summarizeExpenses } from "./summary";

/** Expenses for the period plus the sales numbers needed for the net profit estimate. */
export async function getExpensesPage(period: PeriodId, business: BusinessFilter) {
  await connection();
  const today = manilaDate();
  const range = periodRange(period, today);
  const summary = summarizeExpenses(expenseStore.list(), range, business, today);
  const { kpis } = buildReport(orderStore.list(), range, business, productStore.list());
  return {
    range,
    summary,
    revenue: kpis.revenue,
    costOfGoodsSold: kpis.revenue - kpis.profit,
    includesSample: summary.list.some((e) => e.sample),
  };
}
