import "server-only";

import { connection } from "next/server";

import { listCatalog, listOrders } from "@/features/sales/queries";
import { buildReport, periodRange } from "@/features/sales/report";
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
  const [orders, catalog] = await Promise.all([listOrders(range), listCatalog()]);
  const { kpis } = buildReport(orders, range, business, catalog);
  return {
    range,
    summary,
    revenue: kpis.revenue,
    costOfGoodsSold: kpis.revenue - kpis.profit,
    includesSample: summary.list.some((e) => e.sample),
  };
}
