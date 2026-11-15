import type { CategoryId } from "@/features/products/types";
import { businessOf, type BusinessFilter, type Order, type PeriodId } from "./types";

const DAY = 86_400_000;
const toDate = (d: string) => new Date(`${d}T00:00:00Z`).getTime();
const toDay = (t: number) => new Date(t).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => toDay(toDate(d) + n * DAY);

export type Range = { from: string; to: string; prevFrom: string; prevTo: string };

/** Inclusive YYYY-MM-DD range for a period ending today, plus the same-length range just before it. */
export function periodRange(period: PeriodId, today: string): Range {
  const from =
    period === "today" ? today : period === "7d" ? addDays(today, -6) : period === "30d" ? addDays(today, -29) : `${today.slice(0, 8)}01`;
  const days = Math.round((toDate(today) - toDate(from)) / DAY) + 1;
  const prevTo = addDays(from, -1);
  return { from, to: today, prevFrom: addDays(prevTo, -(days - 1)), prevTo };
}

/** Orders in [from, to] with only the lines that belong to the chosen business. */
function select(orders: Order[], from: string, to: string, business: BusinessFilter) {
  return orders
    .filter((o) => o.date >= from && o.date <= to)
    .map((o) => ({ ...o, lines: o.lines.filter((l) => business === "all" || businessOf(l.category) === business) }))
    .filter((o) => o.lines.length > 0);
}

const revenueOf = (lines: Order["lines"]) => lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
const costOf = (lines: Order["lines"]) => lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
const itemsOf = (lines: Order["lines"]) => lines.reduce((sum, l) => sum + l.quantity, 0);

/**
 * Everything the Sales & Reports page shows, for one period and business. Amounts in centavos.
 * `catalog` lists every menu item so unsold ones still show (for "least-selling").
 */
export function buildReport(
  orders: Order[],
  range: Range,
  business: BusinessFilter,
  catalog: { id: string; name: string; category: CategoryId }[] = [],
) {
  const current = select(orders, range.from, range.to, business);
  const previous = select(orders, range.prevFrom, range.prevTo, business);
  const lines = current.flatMap((o) => o.lines);
  const revenue = revenueOf(lines);

  // One pass for the per-day and per-payment totals.
  const dayTotals = new Map<string, number>();
  const methodTotals = new Map<Order["method"], number>();
  for (const o of current) {
    const amount = revenueOf(o.lines);
    dayTotals.set(o.date, (dayTotals.get(o.date) ?? 0) + amount);
    methodTotals.set(o.method, (methodTotals.get(o.method) ?? 0) + amount);
  }
  const byDay: { date: string; revenue: number }[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) byDay.push({ date: d, revenue: dayTotals.get(d) ?? 0 });

  const byCategory = new Map<CategoryId, number>();
  for (const l of lines) byCategory.set(l.category, (byCategory.get(l.category) ?? 0) + l.quantity * l.unitPrice);

  const products = new Map<string, { productId: string; name: string; category: CategoryId; units: number; revenue: number; profit: number; previousUnits: number }>();
  for (const l of lines) {
    const p = products.get(l.productId) ?? { productId: l.productId, name: l.name, category: l.category, units: 0, revenue: 0, profit: 0, previousUnits: 0 };
    p.units += l.quantity;
    p.revenue += l.quantity * l.unitPrice;
    p.profit += l.quantity * (l.unitPrice - l.unitCost);
    products.set(l.productId, p);
  }
  for (const p of catalog) {
    if (!products.has(p.id) && (business === "all" || businessOf(p.category) === business)) {
      products.set(p.id, { productId: p.id, name: p.name, category: p.category, units: 0, revenue: 0, profit: 0, previousUnits: 0 });
    }
  }
  for (const l of previous.flatMap((o) => o.lines)) {
    const p = products.get(l.productId);
    if (p) p.previousUnits += l.quantity;
  }

  return {
    kpis: {
      revenue,
      orders: current.length,
      items: itemsOf(lines),
      averageOrder: current.length ? Math.round(revenue / current.length) : 0,
      profit: revenue - costOf(lines),
      previousRevenue: revenueOf(previous.flatMap((o) => o.lines)),
      previousOrders: previous.length,
    },
    byDay,
    byMethod: (["cash", "gcash"] as const).map((method) => ({ method, revenue: methodTotals.get(method) ?? 0 })),
    byCategory: [...byCategory].map(([category, revenue]) => ({ category, revenue })).sort((a, b) => b.revenue - a.revenue),
    products: [...products.values()].sort((a, b) => b.units - a.units),
    transactions: [...current]
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .map((o) => ({
        number: o.number,
        completedAt: o.completedAt,
        cashier: o.cashier,
        method: o.method,
        items: itemsOf(o.lines),
        total: revenueOf(o.lines),
        summary: o.lines.map((l) => `${l.quantity}× ${l.name}`).join(", "),
        sample: o.sample ?? false,
      })),
  };
}

export type SalesReport = ReturnType<typeof buildReport>;
