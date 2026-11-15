import "server-only";

import { connection } from "next/server";

import { productStore } from "@/features/products/store";
import { manilaDate } from "@/lib/format";
import { buildReport, periodRange } from "./report";
import { orderStore } from "./store";
import { businesses, periods, type BusinessFilter, type PeriodId } from "./types";

/** Untrusted URL values → a known period / business, falling back to the defaults. */
export function parseReportParams(params: { period?: string | string[]; business?: string | string[] }) {
  const period = periods.find((p) => p.id === params.period)?.id ?? "7d";
  const business = businesses.find((b) => b.id === params.business)?.id ?? "all";
  return { period, business } as { period: PeriodId; business: BusinessFilter };
}

export async function getSalesReport(period: PeriodId, business: BusinessFilter) {
  await connection();
  const range = periodRange(period, manilaDate());
  const orders = orderStore.list();
  return {
    range,
    report: buildReport(orders, range, business, productStore.list()),
    includesSample: orders.some((o) => o.sample && o.date >= range.prevFrom && o.date <= range.to),
  };
}
