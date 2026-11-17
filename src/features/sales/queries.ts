import "server-only";

import { connection } from "next/server";

import { fromDbDate, orderLabel, toDbDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { manilaDate } from "@/lib/format";
import { buildReport, periodRange, type Range } from "./report";
import { businesses, periods, type BusinessFilter, type Order, type PeriodId } from "./types";

/** Untrusted URL values → a known period / business, falling back to the defaults. */
export function parseReportParams(params: { period?: string | string[]; business?: string | string[] }) {
  const period = periods.find((p) => p.id === params.period)?.id ?? "7d";
  const business = businesses.find((b) => b.id === params.business)?.id ?? "all";
  return { period, business } as { period: PeriodId; business: BusinessFilter };
}


/**
 * Completed orders whose Manila day is in the range and the same-length range before it (for the
 * "vs previous" comparisons), shaped as the report functions expect. Lines keep their snapshots.
 */
export async function listOrders(range: Range): Promise<Order[]> {
  const rows = await db.order.findMany({
    where: { date: { gte: toDbDate(range.prevFrom), lte: toDbDate(range.to) } },
    select: {
      number: true,
      completedAt: true,
      date: true,
      method: true,
      cashier: { select: { name: true } },
      lines: { select: { productId: true, name: true, categoryId: true, quantity: true, unitPrice: true, unitCost: true } },
    },
  });
  return rows.map((o) => ({
    number: orderLabel(o.number),
    completedAt: o.completedAt.toISOString(),
    date: fromDbDate(o.date),
    cashier: o.cashier.name,
    method: o.method,
    lines: o.lines.map(({ categoryId, ...l }) => ({ ...l, category: categoryId })),
  }));
}

/** Every active menu item, so products that didn't sell still show (for "least-selling"). */
export async function listCatalog() {
  const rows = await db.product.findMany({ where: { archivedAt: null }, select: { id: true, name: true, categoryId: true } });
  return rows.map(({ categoryId, ...p }) => ({ ...p, category: categoryId }));
}

export async function getSalesReport(period: PeriodId, business: BusinessFilter) {
  await connection();
  const range = periodRange(period, manilaDate());
  const [orders, catalog] = await Promise.all([listOrders(range), listCatalog()]);
  return { range, report: buildReport(orders, range, business, catalog) };
}
