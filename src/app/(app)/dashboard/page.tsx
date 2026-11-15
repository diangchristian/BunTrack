import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Coins, Receipt, ShoppingCart, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { NoAccess } from "@/components/no-access";
import { buttonVariants } from "@/components/ui/button";
import { canManageStore, getCurrentUser } from "@/features/auth/queries";
import { CategoryDonut, RevenueExpensesChart, SalesTrendChart } from "@/features/dashboard/components/charts";
import { Panel } from "@/features/dashboard/components/panel";
import { RecentTransactions } from "@/features/dashboard/components/recent-transactions";
import {
  LowStockAlerts,
  ProductPerformance,
  QuickActions,
  UnavailableProducts,
} from "@/features/dashboard/components/side-panels";
import { StatCard } from "@/components/stat-card";
import { getDashboardData } from "@/features/dashboard/queries";
import { settingsStore } from "@/features/settings/store";
import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const signed = (n: number, digits = 0) => `${n >= 0 ? "+" : ""}${n.toFixed(digits)}`;

function vsYesterday(now: number, before: number, as: "percent" | "count") {
  const up = now >= before;
  const change = as === "percent" ? `${signed(((now - before) / before) * 100, 1)}%` : signed(now - before);
  return { text: `${change} vs yesterday`, kind: up ? "up" : "down", icon: up ? TrendingUp : TrendingDown } as const;
}

export default async function DashboardPage() {
  if (!(await canManageStore())) return <NoAccess page="The dashboard" />;

  const [user, data] = await Promise.all([getCurrentUser(), getDashboardData()]);
  const { today, yesterday } = data;
  const grossProfit = today.sales - today.cogs;
  const netProfit = grossProfit - today.expenses;
  const outOfStock = data.lowStock.filter((item) => item.outOfStock).length;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-[30px] font-bold">Welcome back, {user.firstName}</h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s how {settingsStore.get().shopName} is doing today.
          </p>
        </div>
        <Link href="/pos" className={cn(buttonVariants(), "h-10 px-4")}>
          <ShoppingCart data-icon="inline-start" /> New Order
        </Link>
      </div>

      <section aria-label="Today at a glance" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Total Sales Today"
          value={formatPeso(today.sales)}
          icon={Coins}
          delta={vsYesterday(today.sales, yesterday.sales, "percent")}
        />
        <StatCard
          label="Orders Today"
          value={String(today.orders)}
          icon={Receipt}
          tone="success"
          delta={vsYesterday(today.orders, yesterday.orders, "count")}
        />
        <StatCard
          label="Est. Gross Profit"
          value={formatPeso(grossProfit)}
          icon={TrendingUp}
          tone="success"
          delta={{ text: `${Math.round((grossProfit / today.sales) * 100)}% margin`, kind: "neutral" }}
        />
        <StatCard
          label="Expenses Today"
          value={formatPeso(today.expenses)}
          icon={Wallet}
          delta={{ text: "Rent & utilities", kind: "neutral" }}
        />
        <StatCard
          label="Net Profit Est."
          value={formatPeso(netProfit)}
          icon={Coins}
          tone="success"
          delta={vsYesterday(netProfit, yesterday.netProfit, "percent")}
        />
        <StatCard
          label="Low Stock Items"
          value={String(data.lowStock.length)}
          icon={AlertTriangle}
          tone="danger"
          delta={{ text: `${outOfStock} out of stock`, kind: "alert", icon: AlertTriangle }}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Sales Trend" description="Daily revenue · last 7 days">
          <SalesTrendChart data={data.salesTrend} />
        </Panel>
        <Panel title="Sales by Category" description="Share of revenue · this week">
          <CategoryDonut data={data.salesByCategory} />
        </Panel>

        <Panel title="Revenue vs Expenses" description="Monthly · Jun–Nov 2026 (Nov month-to-date)">
          <RevenueExpensesChart data={data.revenueVsExpenses} />
        </Panel>
        <ProductPerformance items={data.bestSellers} />

        <RecentTransactions rows={data.recentTransactions} />
        <div className="flex flex-col gap-6">
          <LowStockAlerts items={data.lowStock} />
          <UnavailableProducts items={data.unavailableProducts} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
