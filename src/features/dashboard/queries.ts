import "server-only";

import { connection } from "next/server";

import { canUseStore } from "@/features/auth/queries";
import type { ItemCategory } from "@/features/inventory/types";
import { addDays } from "@/features/sales/report";
import { fromDbDate as asDay, toDbDate as asDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { manilaDate } from "@/lib/format";
import {
  lowStockRows,
  monthlyChart,
  recentTransactionRows,
  sixMonths,
  summarizeWeek,
  todayAndYesterday,
  unavailableRows,
} from "./summary";


/**
 * Everything the dashboard shows, read from Postgres. This file only fetches: each part is one
 * small query, all run in parallel, and the rows (in centavos) go to ./summary.ts, which does
 * the adding up and is unit-tested.
 */
export async function getDashboardData() {
  // queries.ts checks access too, so reusing this elsewhere can't skip it (features/README.md).
  if (!(await canUseStore())) throw new Error("Not allowed to read the dashboard");
  await connection(); // always fresh: sales come in all day

  const today = manilaDate();
  const chartStart = `${sixMonths(today)[0]}-01`;

  const [weekOrders, recent, expenseDays, monthlySales, monthlyExpenses, categories, items, products] = await Promise.all([
    // This week's orders with just the line columns the totals need (~1,000 a week for one shop).
    db.order.findMany({
      where: { date: { gte: asDate(addDays(today, -6)), lte: asDate(today) } },
      select: { date: true, lines: { select: { name: true, categoryId: true, quantity: true, unitPrice: true, unitCost: true } } },
    }),
    db.order.findMany({
      orderBy: { completedAt: "desc" },
      take: 6,
      select: { number: true, date: true, completedAt: true, method: true, lines: { select: { name: true, quantity: true, unitPrice: true } } },
    }),
    // Today's and yesterday's operating expenses, added up by the database.
    db.expense.groupBy({
      by: ["date"],
      where: { date: { gte: asDate(addDays(today, -1)), lte: asDate(today) } },
      _sum: { amount: true },
    }),
    // Six months is too many orders to load just to add up, and Prisma's groupBy can't multiply
    // two columns or group by month, so these two are SQL. ${} values are sent as parameters,
    // never pasted into the query text, so they're safe from SQL injection.
    db.$queryRaw<{ month: string; revenue: bigint; cogs: bigint }[]>`
      SELECT to_char(o."date", 'YYYY-MM') AS month,
             SUM(l."quantity" * l."unitPrice")::bigint AS revenue,
             SUM(l."quantity" * l."unitCost")::bigint AS cogs
      FROM "orderLine" l JOIN "order" o ON o."id" = l."orderId"
      WHERE o."date" >= ${chartStart}::date
      GROUP BY 1`,
    db.$queryRaw<{ month: string; amount: bigint }[]>`
      SELECT to_char("date", 'YYYY-MM') AS month, SUM("amount")::bigint AS amount
      FROM "expense"
      WHERE "date" >= ${chartStart}::date
      GROUP BY 1`,
    db.category.findMany({ orderBy: { position: "asc" }, select: { id: true, label: true } }),
    // A shop has dozens of items, so all active ones are read and judged by the same rules as
    // the Inventory page and the POS.
    db.inventoryItem.findMany({ where: { archivedAt: null } }),
    db.product.findMany({
      where: { archivedAt: null, available: true },
      select: { name: true, categoryId: true, pieces: true, recipe: { select: { itemId: true, quantity: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  // Rows shaped for ./summary.ts. A category is checked against itemCategories (zod) when an
  // item is saved; a packSize of null means it isn't bought by the pack.
  const stock = items.map((i) => ({ ...i, category: i.category as ItemCategory, packSize: i.packSize ?? undefined }));
  const week = summarizeWeek(
    weekOrders.map((o) => ({ date: asDay(o.date), lines: o.lines })),
    today,
    categories,
  );
  const chart = monthlyChart(
    monthlySales.map((r) => ({ month: r.month, revenue: Number(r.revenue), cogs: Number(r.cogs) })),
    monthlyExpenses.map((r) => ({ month: r.month, amount: Number(r.amount) })),
    today,
  );

  return {
    ...todayAndYesterday(
      week,
      expenseDays.map((e) => ({ date: asDay(e.date), amount: e._sum.amount ?? 0 })),
      today,
    ),
    salesTrend: week.salesTrend,
    salesByCategory: week.salesByCategory,
    revenueVsExpenses: chart.months,
    revenueVsExpensesLabel: chart.label,
    bestSellers: week.bestSellers,
    recentTransactions: recentTransactionRows(
      recent.map((o) => ({ ...o, date: asDay(o.date) })),
      today,
    ),
    lowStock: lowStockRows(stock),
    unavailableProducts: unavailableRows(products, stock),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
