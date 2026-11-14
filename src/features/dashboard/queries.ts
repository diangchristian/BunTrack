import "server-only";

// shortcut: returns the Figma sample numbers (Sat, Nov 14, 2026). Replace each
// field with a Prisma query once orders, inventory and expenses have tables.
export async function getDashboardData() {
  const today = { sales: 18450, orders: 126, cogs: 7560, expenses: 3200 };

  return {
    today,
    yesterday: { sales: 16413, orders: 118, netProfit: 7248 },

    salesTrend: [
      { day: "Sun 8", revenue: 14200, orders: 108 },
      { day: "Mon 9", revenue: 15800, orders: 121 },
      { day: "Tue 10", revenue: 13100, orders: 97 },
      { day: "Wed 11", revenue: 16900, orders: 130 },
      { day: "Thu 12", revenue: 21300, orders: 151 },
      { day: "Fri 13", revenue: 24600, orders: 162 },
      { day: "Sat 14", revenue: 18450, orders: 126 },
    ],

    // Revenue for the week, by menu category. Ice cream shares the same POS.
    salesByCategory: [
      { category: "burgers", label: "Burgers", revenue: 72410 },
      { category: "combos", label: "Combo Meals", revenue: 22470 },
      { category: "drinks", label: "Drinks", revenue: 14980 },
      { category: "sides", label: "Sides", revenue: 11240 },
      { category: "iceCream", label: "Ice Cream", revenue: 3750 },
    ],

    // In thousands of pesos. Expenses = COGS + operating (no salaries: family-run).
    revenueVsExpenses: [
      { month: "Jun", revenue: 312, expenses: 178 },
      { month: "Jul", revenue: 298, expenses: 169 },
      { month: "Aug", revenue: 335, expenses: 185 },
      { month: "Sep", revenue: 351, expenses: 194 },
      { month: "Oct", revenue: 368, expenses: 202 },
      { month: "Nov", revenue: 172, expenses: 88 },
    ],

    bestSellers: [
      { name: "Classic Cheeseburger", unitsSold: 412 },
      { name: "Double Cheeseburger", unitsSold: 298 },
      { name: "French Fries", unitsSold: 276 },
      { name: "Bacon Burger", unitsSold: 201 },
      { name: "Iced Tea", unitsSold: 188 },
      { name: "Soft Drinks", unitsSold: 164 },
    ],

    recentTransactions: [
      { id: "#1042", time: "12:41 PM", items: "2× Classic Cheeseburger, 1× Iced Tea", payment: "Cash", total: 367, status: "completed" },
      { id: "#1041", time: "12:36 PM", items: "1× Double Cheeseburger, 1× Fries", payment: "GCash", total: 298, status: "completed" },
      { id: "#1040", time: "12:30 PM", items: "1× Bacon Burger Combo", payment: "Cash", total: 259, status: "voided" },
      { id: "#1039", time: "12:22 PM", items: "3× Chicken Burger, 3× Soft Drinks", payment: "GCash", total: 657, status: "completed" },
      { id: "#1038", time: "12:15 PM", items: "1× Classic Cheeseburger", payment: "Cash", total: 149, status: "completed" },
      { id: "#1037", time: "12:09 PM", items: "2× French Fries, 2× Iced Tea", payment: "GCash", total: 296, status: "cancelled" },
    ] as const,

    lowStock: [
      { name: "Onions", left: "0 kg", min: "3 kg", outOfStock: true },
      { name: "Beef Patties", left: "18 pcs", min: "40 pcs", outOfStock: false },
      { name: "Cheese Slices", left: "42 pcs", min: "60 pcs", outOfStock: false },
      { name: "Lettuce", left: "0.6 kg", min: "2 kg", outOfStock: false },
      { name: "Burger Buns", left: "35 pcs", min: "50 pcs", outOfStock: false },
    ],

    unavailableProducts: [{ name: "Onion Rings", reason: "Needs Onions (0 kg in stock)" }],
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
