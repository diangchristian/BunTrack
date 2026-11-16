import { categoryLabel, type Category } from "@/features/categories/types";
import { formatQuantity, stockStatus } from "@/features/inventory/costing";
import type { InventoryItem, RecipeLine } from "@/features/inventory/types";
import type { PaymentMethod } from "@/features/pos/types";
import { costProduct } from "@/features/products/costing";
import { unavailableReason } from "@/features/products/types";
import { addDays, costOf, revenueOf } from "@/features/sales/report";

// The dashboard's numbers, worked out from rows its queries fetch. Pure functions, so they're
// unit-tested without a database. Rows come in centavos, as stored; everything out is pesos.

type Line = { name: string; categoryId: string; quantity: number; unitPrice: number; unitCost: number };
/** An order as the week's numbers need it. `date` is its Manila day, YYYY-MM-DD. */
export type DashboardOrder = { date: string; lines: Line[] };

const pesos = (centavos: number) => centavos / 100;
/** Centavos to thousands of pesos with one decimal: 31,250,000 → 312.5 (₱312.5k). */
const thousands = (centavos: number) => Math.round(centavos / 10_000) / 10;

/** Today, yesterday and the last 7 days (today included), from that week's orders. */
export function summarizeWeek(orders: DashboardOrder[], today: string, categories: Category[]) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const totals = (day: string) => {
    const dayOrders = orders.filter((o) => o.date === day);
    const lines = dayOrders.flatMap((o) => o.lines);
    return { sales: pesos(revenueOf(lines)), orders: dayOrders.length, cogs: pesos(costOf(lines)) };
  };

  const weekLines = orders.filter((o) => days.includes(o.date)).flatMap((o) => o.lines);
  const byCategory = new Map<string, number>();
  const byProduct = new Map<string, number>();
  for (const l of weekLines) {
    byCategory.set(l.categoryId, (byCategory.get(l.categoryId) ?? 0) + l.quantity * l.unitPrice);
    byProduct.set(l.name, (byProduct.get(l.name) ?? 0) + l.quantity);
  }

  return {
    today: totals(today),
    yesterday: totals(days[5]),
    salesTrend: days.map((day) => {
      const d = new Date(`${day}T00:00:00Z`);
      const t = totals(day);
      return { day: `${d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })} ${d.getUTCDate()}`, revenue: t.sales, orders: t.orders };
    }),
    // Line categories are snapshots, so a category deleted since still shows its sales.
    salesByCategory: [...byCategory]
      .sort((a, b) => b[1] - a[1])
      .map(([category, revenue]) => ({ category, label: categoryLabel(category, categories), revenue: pesos(revenue) })),
    bestSellers: [...byProduct]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, unitsSold]) => ({ name, unitsSold })),
  };
}

/** The stat cards: the week's totals for today and yesterday, plus each day's operating expenses. */
export function todayAndYesterday(
  week: Pick<ReturnType<typeof summarizeWeek>, "today" | "yesterday">,
  expenses: { date: string; amount: number }[],
  today: string,
) {
  const spentOn = (day: string) => pesos(expenses.find((e) => e.date === day)?.amount ?? 0);
  const t = week.today;
  const y = week.yesterday;
  const grossProfit = t.sales - t.cogs;
  return {
    today: {
      ...t,
      expenses: spentOn(today),
      grossProfit,
      netProfit: grossProfit - spentOn(today),
      // null when nothing sold: a margin of ₱0 is meaningless, and 0 / 0 would be NaN.
      marginPercent: t.sales ? Math.round((grossProfit / t.sales) * 100) : null,
    },
    yesterday: { sales: y.sales, orders: y.orders, netProfit: y.sales - y.cogs - spentOn(addDays(today, -1)) },
  };
}

/** The six months the revenue chart shows, oldest first, ending with this month (YYYY-MM). */
export function sixMonths(today: string) {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + i - 5);
    return d.toISOString().slice(0, 7);
  });
}

const monthName = (ym: string, withYear = false) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", ...(withYear && { year: "numeric" }), timeZone: "UTC" });

/**
 * The last 6 months (this one month-to-date). Expenses are cost of goods sold plus operating
 * expenses, matching the chart's legend; months with nothing show as zero.
 */
export function monthlyChart(
  sales: { month: string; revenue: number; cogs: number }[],
  expenses: { month: string; amount: number }[],
  today: string,
) {
  const months = sixMonths(today);
  const first = months[0];
  const last = months[5];
  const sameYear = first.slice(0, 4) === last.slice(0, 4);

  return {
    label: `${monthName(first, !sameYear)}–${monthName(last, true)} (${monthName(last)} month-to-date)`,
    months: months.map((m) => {
      const s = sales.find((r) => r.month === m);
      const operating = expenses.find((r) => r.month === m)?.amount ?? 0;
      return { month: monthName(m), revenue: thousands(s?.revenue ?? 0), expenses: thousands((s?.cogs ?? 0) + operating) };
    }),
  };
}

const methodLabel: Record<PaymentMethod, string> = { cash: "Cash", gcash: "GCash" };
const manilaTime = (at: Date) => at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });

/** The latest orders as Recent Transactions shows them. Older days get their date, so they don't look like today's. */
export function recentTransactionRows(
  orders: { number: number; date: string; completedAt: Date; method: PaymentMethod; lines: Omit<Line, "categoryId" | "unitCost">[] }[],
  today: string,
) {
  return orders.map((o) => ({
    id: `#${o.number}`,
    time:
      o.date === today
        ? manilaTime(o.completedAt)
        : `${new Date(`${o.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} · ${manilaTime(o.completedAt)}`,
    items: o.lines.map((l) => `${l.quantity}× ${l.name}`).join(", "),
    payment: methodLabel[o.method],
    total: pesos(revenueOf(o.lines)),
    // shortcut: there are no voids yet, so every saved order is completed. Add a status column with voids.
    status: "completed" as const,
  }));
}

/** Items at or below their reorder point: out of stock first, then the emptiest. */
export function lowStockRows(items: Pick<InventoryItem, "name" | "unit" | "quantity" | "minimum">[]) {
  const fill = (i: (typeof items)[number]) => (i.minimum ? i.quantity / i.minimum : 0);
  return items
    .filter((i) => stockStatus(i) !== "in")
    .sort((a, b) => fill(a) - fill(b))
    .map((i) => ({
      name: i.name,
      left: formatQuantity(i.quantity, i.unit),
      min: formatQuantity(i.minimum, i.unit),
      outOfStock: stockStatus(i) === "out",
    }));
}

/**
 * Products switched on for sale that the stock can't make right now, with the same reason the
 * POS shows ("Out of Onions"). Products without a recipe aren't tracked, so they never appear.
 */
export function unavailableRows(
  products: { name: string; categoryId: string; pieces: number; recipe: RecipeLine[] }[],
  items: InventoryItem[],
) {
  return products.flatMap((p) => {
    const { servingsLeft, limitedBy } = costProduct(p, p.recipe, items);
    if (servingsLeft !== 0) return [];
    const reason = unavailableReason({ available: true, servingsLeft, limitedBy, category: p.categoryId });
    return reason ? [{ name: p.name, reason }] : [];
  });
}
