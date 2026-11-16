import assert from "node:assert/strict";
import { test } from "node:test";

import { lowStockRows, monthlyChart, recentTransactionRows, sixMonths, summarizeWeek, todayAndYesterday, unavailableRows, type DashboardOrder } from "./summary";

// Money in these fixtures is centavos, as stored; the dashboard shows pesos.
const categories = [
  { id: "burgers", label: "Burgers" },
  { id: "drinks", label: "Drinks" },
];
const burger = { name: "Classic Cheeseburger", categoryId: "burgers", unitPrice: 14900, unitCost: 6000 };
const tea = { name: "Iced Tea", categoryId: "drinks", unitPrice: 4900, unitCost: 1500 };
const order = (date: string, lines: DashboardOrder["lines"]): DashboardOrder => ({ date, lines });

test("today, yesterday and the 7-day trend, in pesos, with empty days as zero", () => {
  const week = summarizeWeek(
    [
      order("2026-11-17", [{ ...burger, quantity: 2 }, { ...tea, quantity: 1 }]), // ₱347, cost ₱135
      order("2026-11-17", [{ ...burger, quantity: 1 }]), // ₱149, cost ₱60
      order("2026-11-16", [{ ...tea, quantity: 3 }]), // ₱147, cost ₱45
      order("2026-11-11", [{ ...burger, quantity: 1 }]), // first day of the week
    ],
    "2026-11-17",
    categories,
  );
  assert.deepEqual(week.today, { sales: 496, orders: 2, cogs: 195 });
  assert.deepEqual(week.yesterday, { sales: 147, orders: 1, cogs: 45 });
  assert.deepEqual(
    week.salesTrend.map((d) => [d.day, d.revenue, d.orders]),
    [
      ["Wed 11", 149, 1],
      ["Thu 12", 0, 0],
      ["Fri 13", 0, 0],
      ["Sat 14", 0, 0],
      ["Sun 15", 0, 0],
      ["Mon 16", 147, 1],
      ["Tue 17", 496, 2],
    ],
  );
});

test("sales by category and best sellers cover the whole week, biggest first", () => {
  const week = summarizeWeek(
    [
      order("2026-11-17", [{ ...burger, quantity: 1 }, { ...tea, quantity: 4 }]),
      order("2026-11-12", [{ ...burger, quantity: 2 }, { name: "Old Promo", categoryId: "promos", quantity: 1, unitPrice: 1000, unitCost: 0 }]),
    ],
    "2026-11-17",
    categories,
  );
  assert.deepEqual(week.salesByCategory, [
    { category: "burgers", label: "Burgers", revenue: 447 },
    { category: "drinks", label: "Drinks", revenue: 196 },
    { category: "promos", label: "Removed category", revenue: 10 },
  ]);
  assert.deepEqual(week.bestSellers, [
    { name: "Iced Tea", unitsSold: 4 },
    { name: "Classic Cheeseburger", unitsSold: 3 },
    { name: "Old Promo", unitsSold: 1 },
  ]);
});

test("a week with no sales is all zeros, never NaN", () => {
  const week = summarizeWeek([], "2026-11-17", categories);
  assert.deepEqual(week.today, { sales: 0, orders: 0, cogs: 0 });
  assert.equal(week.salesTrend.length, 7);
  assert.deepEqual(week.salesByCategory, []);
  assert.deepEqual(week.bestSellers, []);
});

test("revenue vs expenses: the last 6 months in thousands of pesos; expenses = cost of goods + operating", () => {
  const chart = monthlyChart(
    [
      { month: "2026-07", revenue: 31_250_000, cogs: 12_000_000 }, // ₱312,500 sales, ₱120,000 COGS
      { month: "2026-11", revenue: 1_234_500, cogs: 500_000 },
      { month: "2026-04", revenue: 99_900_000, cogs: 0 }, // too old: dropped
    ],
    [{ month: "2026-07", amount: 5_800_000 }],
    "2026-11-17",
  );
  assert.equal(chart.label, "Jun–Nov 2026 (Nov month-to-date)");
  assert.deepEqual(chart.months, [
    { month: "Jun", revenue: 0, expenses: 0 },
    { month: "Jul", revenue: 312.5, expenses: 178 },
    { month: "Aug", revenue: 0, expenses: 0 },
    { month: "Sep", revenue: 0, expenses: 0 },
    { month: "Oct", revenue: 0, expenses: 0 },
    { month: "Nov", revenue: 12.3, expenses: 5 },
  ]);
});

test("the 6 months can cross a new year", () => {
  assert.equal(monthlyChart([], [], "2027-02-03").label, "Sep 2026–Feb 2027 (Feb month-to-date)");
});

test("recent transactions read like the receipt, with Manila times", () => {
  const rows = recentTransactionRows([
    {
      number: 1043,
      date: "2026-11-17",
      completedAt: new Date("2026-11-17T04:41:00Z"), // 12:41 PM in Manila
      method: "gcash",
      lines: [{ ...burger, quantity: 2 }, { ...tea, quantity: 1 }],
    },
  ], "2026-11-17");
  assert.deepEqual(rows, [
    { id: "#1043", time: "12:41 PM", items: "2× Classic Cheeseburger, 1× Iced Tea", payment: "GCash", total: 347, status: "completed" },
  ]);
});

test("an older order shows its date too, so it doesn't look like today's", () => {
  const [row] = recentTransactionRows(
    [{ number: 1001, date: "2026-11-16", completedAt: new Date("2026-11-16T08:10:00Z"), method: "cash", lines: [{ ...tea, quantity: 1 }] }],
    "2026-11-17",
  );
  assert.equal(row.time, "Nov 16 · 4:10 PM");
});

test("low stock lists out-of-stock items first, then the lowest", () => {
  const rows = lowStockRows([
    { name: "Burger Buns", unit: "pcs", quantity: 35, minimum: 50 },
    { name: "Cheese Slices", unit: "pcs", quantity: 80, minimum: 60 }, // fine: not listed
    { name: "Lettuce", unit: "kg", quantity: 600, minimum: 2000 },
    { name: "Onions", unit: "kg", quantity: 0, minimum: 3000 },
  ]);
  assert.deepEqual(rows, [
    { name: "Onions", left: "0 kg", min: "3 kg", outOfStock: true },
    { name: "Lettuce", left: "0.6 kg", min: "2 kg", outOfStock: false },
    { name: "Burger Buns", left: "35 pcs", min: "50 pcs", outOfStock: false },
  ]);
});

test("today and yesterday add expenses (centavos in, pesos out) and work out profit and margin", () => {
  const week = summarizeWeek([order("2026-11-17", [{ ...burger, quantity: 2 }]), order("2026-11-16", [{ ...tea, quantity: 3 }])], "2026-11-17", categories);
  const days = todayAndYesterday(week, [
    { date: "2026-11-17", amount: 25000 },
    { date: "2026-11-16", amount: 10000 },
  ], "2026-11-17");
  // Today: ₱298 sales, ₱120 cost, ₱250 expenses. Yesterday: ₱147 sales, ₱45 cost, ₱100 expenses.
  assert.deepEqual(days.today, { sales: 298, orders: 1, cogs: 120, expenses: 250, grossProfit: 178, netProfit: -72, marginPercent: 60 });
  assert.deepEqual(days.yesterday, { sales: 147, orders: 1, netProfit: 2 });
  const quiet = todayAndYesterday(summarizeWeek([], "2026-11-17", categories), [], "2026-11-17");
  assert.equal(quiet.today.marginPercent, null, "no sales: no margin, never NaN");
});

test("products that are switched on but can't be made, with the POS's reason", () => {
  const items = [
    { id: "onions", name: "Onions", category: "Produce" as const, unit: "kg" as const, quantity: 0, minimum: 3000, unitCost: 8000 },
    { id: "buns", name: "Buns", category: "Bakery" as const, unit: "pcs" as const, quantity: 40, minimum: 50, unitCost: 800 },
  ];
  const rows = unavailableRows(
    [
      { name: "Onion Burger", categoryId: "burgers", pieces: 1, recipe: [{ itemId: "onions", quantity: 20 }, { itemId: "buns", quantity: 1 }] },
      { name: "Plain Burger", categoryId: "burgers", pieces: 1, recipe: [{ itemId: "buns", quantity: 1 }] },
      { name: "Bottled Water", categoryId: "drinks", pieces: 1, recipe: [] }, // no recipe: not tracked
    ],
    items,
  );
  assert.deepEqual(rows, [{ name: "Onion Burger", reason: "Out of Onions" }]);
});

test("the six months the chart and its query share", () => {
  assert.deepEqual(sixMonths("2026-11-17"), ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
});
