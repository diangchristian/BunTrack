import type { Metadata } from "next";
import { Coins, Info, Package, Receipt, ShoppingCart, TrendingDown, TrendingUp } from "lucide-react";

import { NoAccess } from "@/components/no-access";
import { canManageStore } from "@/features/auth/queries";
import { SegmentedLinks } from "@/components/segmented-links";
import { StatCard } from "@/components/stat-card";
import { categoryLabel } from "@/features/products/types";
import { ProductPerformance } from "@/features/sales/components/product-performance";
import { RevenueChart } from "@/features/sales/components/revenue-chart";
import { TransactionHistory } from "@/features/sales/components/transaction-history";
import { getSalesReport, parseReportParams } from "@/features/sales/queries";
import { businesses, periods } from "@/features/sales/types";
import { formatCentavos, formatPeso, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Sales & Reports" };

const shortDate = formatShortDate;

function vsPrevious(now: number, before: number, label: string) {
  if (!before) return { text: `No sales ${label}`, kind: "neutral" as const };
  const pct = ((now - before) / before) * 100;
  return {
    text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs ${label}`,
    kind: pct >= 0 ? ("up" as const) : ("down" as const),
    icon: pct >= 0 ? TrendingUp : TrendingDown,
  };
}

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  if (!(await canManageStore())) return <NoAccess page="Sales & Reports" />;

  const { period, business } = parseReportParams(await searchParams);
  const { range, report, includesSample } = await getSalesReport(period, business);
  const { kpis } = report;
  const prevLabel = range.prevFrom === range.prevTo ? shortDate(range.prevFrom) : `${shortDate(range.prevFrom)}–${shortDate(range.prevTo)}`;
  const totalByMethod = report.byMethod.reduce((sum, m) => sum + m.revenue, 0);
  const topCategory = report.byCategory[0]?.revenue ?? 0;
  const href = (next: { period?: string; business?: string }) => `/reports?${new URLSearchParams({ period, business, ...next })}`;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] leading-[30px] font-bold">Sales &amp; Reports</h1>
        <p className="text-sm text-muted-foreground">Revenue, product performance and transaction history from completed POS orders.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedLinks label="Business" options={businesses.map((b) => ({ ...b, href: href({ business: b.id }) }))} active={business} />
        <SegmentedLinks label="Period" options={periods.map((p) => ({ ...p, href: href({ period: p.id }) }))} active={period} />
        <span className="text-xs text-muted-foreground">
          {range.from === range.to ? shortDate(range.from) : `${shortDate(range.from)} – ${shortDate(range.to)}`}, compared with {prevLabel}
        </span>
      </div>

      {includesSample && (
        <p className="flex items-center gap-2 rounded-[10px] bg-secondary px-3 py-2 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0" aria-hidden />
          Includes sample orders so this page has data to show. Your real POS sales are added on top; both reset when the server restarts until the database is connected.
        </p>
      )}

      <section aria-label="Sales summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Revenue" value={formatPeso(kpis.revenue / 100)} icon={Coins} delta={vsPrevious(kpis.revenue, kpis.previousRevenue, prevLabel)} />
        <StatCard label="Transactions" value={kpis.orders.toLocaleString("en-PH")} icon={Receipt} tone="success" delta={vsPrevious(kpis.orders, kpis.previousOrders, prevLabel)} />
        <StatCard label="Products Sold" value={kpis.items.toLocaleString("en-PH")} icon={Package} delta={{ text: "Units in completed orders", kind: "neutral" }} />
        <StatCard label="Avg. Order Value" value={formatCentavos(kpis.averageOrder)} icon={ShoppingCart} tone="success" delta={{ text: "Revenue ÷ transactions", kind: "neutral" }} />
        <StatCard
          label="Est. Gross Profit"
          value={formatPeso(kpis.profit / 100)}
          icon={TrendingUp}
          tone="success"
          delta={{ text: kpis.revenue ? `${((kpis.profit / kpis.revenue) * 100).toFixed(1)}% margin` : "No sales yet", kind: "neutral" }}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card title="Revenue by day" description="Completed orders only">
          <RevenueChart data={report.byDay} />
        </Card>
        <Card title="Payment methods" description="Share of revenue">
          {totalByMethod === 0 ? (
            <p className="text-sm text-muted-foreground">No sales in this period.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex h-5 gap-0.5 overflow-hidden rounded-[4px]" aria-hidden>
                {report.byMethod.map((m, i) => (
                  <span key={m.method} className={i === 0 ? "bg-chart-1" : "bg-chart-2"} style={{ width: `${(m.revenue / totalByMethod) * 100}%` }} />
                ))}
              </div>
              {report.byMethod.map((m, i) => (
                <p key={m.method} className="flex items-center gap-2.5 text-sm">
                  <span className={cn("size-2.5 rounded-[3px]", i === 0 ? "bg-chart-1" : "bg-chart-2")} aria-hidden />
                  <span className="flex-1 font-medium">{m.method === "cash" ? "Cash" : "GCash"}</span>
                  <span className="font-semibold tabular-nums">{formatPeso(m.revenue / 100)}</span>
                  <span className="w-10 text-right text-xs text-muted-foreground">{Math.round((m.revenue / totalByMethod) * 100)}%</span>
                </p>
              ))}
            </div>
          )}
          {report.byCategory.length > 0 && (
            <div className="flex flex-col gap-2.5 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground">By category</p>
              {report.byCategory.map((c) => (
                <p key={c.category} className="flex items-center gap-2.5 text-xs">
                  <span className="w-24 shrink-0 text-muted-foreground">{categoryLabel(c.category)}</span>
                  <span className="h-2 flex-1 rounded-full bg-neutral-soft" aria-hidden>
                    <span className="block h-2 rounded-full bg-chart-1" style={{ width: `${topCategory ? (c.revenue / topCategory) * 100 : 0}%` }} />
                  </span>
                  <span className="w-9 text-right font-semibold tabular-nums">{kpis.revenue ? Math.round((c.revenue / kpis.revenue) * 100) : 0}%</span>
                </p>
              ))}
            </div>
          )}
        </Card>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
        <ProductPerformance products={report.products} />
      </section>
      <section className="rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
        <TransactionHistory key={`${period}-${business}`} transactions={report.transactions} />
      </section>
    </div>
  );
}

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
