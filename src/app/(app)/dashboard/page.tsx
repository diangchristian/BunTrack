import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, Coins, Receipt, ShoppingCart, TrendingUp, Wallet } from "lucide-react";

import { NoAccess } from "@/components/no-access";
import { buttonVariants } from "@/components/ui/button";
import { canUseStore, getCurrentUser } from "@/features/auth/queries";
import { CategoryDonut, RevenueExpensesChart, SalesTrendChart } from "@/features/dashboard/components/charts";
import { Panel } from "@/features/dashboard/components/panel";
import { RecentTransactions } from "@/features/dashboard/components/recent-transactions";
import {
  LowStockAlerts,
  ProductPerformance,
  QuickActions,
  UnavailableProducts,
} from "@/features/dashboard/components/side-panels";
import { EmptyNote } from "@/components/empty-note";
import { StatCard } from "@/components/stat-card";
import { vsPrevious } from "@/features/dashboard/delta";
import { getDashboardData } from "@/features/dashboard/queries";
import { getSettings } from "@/features/settings/queries";
import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/page-skeleton";

export const metadata: Metadata = { title: "Dashboard" };

// The whole page streams under its own Suspense: on a move between pages only the page
// re-renders, so (app)/loading.tsx sits too high to cover its reads.
export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton stats={6} body="split" />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  if (!(await canUseStore())) return <NoAccess page="The dashboard" />;

  const [user, data, shop] = await Promise.all([getCurrentUser(), getDashboardData(), getSettings()]);
  const { today, yesterday } = data;
  const outOfStock = data.lowStock.filter((item) => item.outOfStock).length;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-[30px] font-bold">Welcome back, {user.firstName}</h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s how {shop.shopName} is doing today.
          </p>
        </div>
        <Link href="/pos" className={cn(buttonVariants(), "h-10 px-4")}>
          <ShoppingCart data-icon="inline-start" /> New order
        </Link>
      </div>

      <section aria-label="Today at a glance" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Total Sales Today"
          value={formatPeso(today.sales)}
          icon={Coins}
          delta={vsPrevious(today.sales, yesterday.sales, "yesterday")}
        />
        <StatCard
          label="Orders Today"
          value={String(today.orders)}
          icon={Receipt}
          tone="success"
          delta={vsPrevious(today.orders, yesterday.orders, "yesterday", "count")}
        />
        <StatCard
          label="Est. Gross Profit"
          value={formatPeso(today.grossProfit)}
          icon={TrendingUp}
          tone="success"
          delta={{ text: today.marginPercent === null ? "No sales yet" : `${today.marginPercent}% margin`, kind: "neutral" }}
        />
        <StatCard
          label="Expenses Today"
          value={formatPeso(today.expenses)}
          icon={Wallet}
          delta={{ text: "Electricity, LPG, supplies…", kind: "neutral" }}
        />
        <StatCard
          label="Net Profit Est."
          value={formatPeso(today.netProfit)}
          icon={Coins}
          tone="success"
          delta={vsPrevious(today.netProfit, yesterday.netProfit, "yesterday")}
        />
        <StatCard
          label="Low Stock Items"
          value={String(data.lowStock.length)}
          icon={AlertTriangle}
          tone="danger"
          delta={{ text: `${outOfStock} out of stock`, kind: "alert", icon: AlertTriangle }}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Sales Trend" description="Daily revenue · last 7 days">
          <SalesTrendChart data={data.salesTrend} />
        </Panel>
        <Panel title="Sales by Category" description="Share of revenue · this week">
          {data.salesByCategory.length ? (
            <CategoryDonut data={data.salesByCategory} />
          ) : (
            <EmptyNote>No sales this week yet.</EmptyNote>
          )}
        </Panel>

        <Panel title="Revenue vs Expenses" description={`Monthly · ${data.revenueVsExpensesLabel}`}>
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
