import type { Metadata } from "next";
import { CalendarDays, Coins, Info, Receipt, Tags, TrendingDown, TrendingUp } from "lucide-react";

import { NoAccess } from "@/components/no-access";
import { canUseStore } from "@/features/auth/queries";
import { SegmentedLinks } from "@/components/segmented-links";
import { StatCard } from "@/components/stat-card";
import { ExpensesManager } from "@/features/expenses/components/expenses-manager";
import { getExpensesPage } from "@/features/expenses/queries";
import { parseReportParams } from "@/features/sales/queries";
import { businesses, periods } from "@/features/sales/types";
import { formatCentavos, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Expenses" };

const shortDate = formatShortDate;
// Centavos everywhere, so the net profit formula adds up exactly and matches the table.
const peso = formatCentavos;

export default async function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  if (!(await canUseStore())) return <NoAccess page="Expenses" />;

  const { period, business } = parseReportParams(await searchParams);
  const { range, summary, revenue, costOfGoodsSold, includesSample } = await getExpensesPage(period, business);
  const net = revenue - costOfGoodsSold - summary.total;
  const largest = summary.byCategory[0];
  const prevLabel = range.prevFrom === range.prevTo ? shortDate(range.prevFrom) : `${shortDate(range.prevFrom)}–${shortDate(range.prevTo)}`;
  const change = summary.previousTotal ? ((summary.total - summary.previousTotal) / summary.previousTotal) * 100 : null;
  const href = (next: { period?: string; business?: string }) => `/expenses?${new URLSearchParams({ period, business, ...next })}`;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] leading-[30px] font-bold">Expenses</h1>
        <p className="text-sm text-muted-foreground">
          Operating costs only. Ingredients and Dan Eric stock are recorded with Stock In and counted when sold, so they&apos;re never counted twice here.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedLinks label="Business" options={businesses.map((b) => ({ ...b, href: href({ business: b.id }) }))} active={business} />
        <SegmentedLinks label="Period" options={periods.map((p) => ({ ...p, href: href({ period: p.id }) }))} active={period} />
        <span className="text-xs text-muted-foreground">
          {range.from === range.to ? shortDate(range.from) : `${shortDate(range.from)} – ${shortDate(range.to)}`}
        </span>
      </div>

      {includesSample && (
        <p className="flex items-center gap-2 rounded-[10px] bg-secondary px-3 py-2 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0" aria-hidden />
          Includes sample expenses so this page has data to show. Edit or delete them freely; everything resets when the server restarts until the database is connected.
        </p>
      )}

      <section aria-label="Expense summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Expenses"
          value={peso(summary.total)}
          icon={Receipt}
          delta={
            change === null
              ? { text: `None ${prevLabel}`, kind: "neutral" }
              : // Spending less is good news, so a drop shows as green.
                { text: `${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs ${prevLabel}`, kind: change <= 0 ? "up" : "down", icon: change <= 0 ? TrendingDown : TrendingUp }
          }
        />
        <StatCard label="Paid Today" value={peso(summary.today)} icon={CalendarDays} delta={{ text: summary.today ? "Expenses dated today" : "Nothing paid today yet", kind: "neutral" }} />
        <StatCard
          label="Largest Category"
          value={largest?.category ?? "—"}
          icon={Tags}
          tone="success"
          delta={{ text: largest ? `${peso(largest.amount)} · ${Math.round((largest.amount / summary.total) * 100)}% of expenses` : "No expenses", kind: "neutral" }}
        />
        <StatCard
          label="Net Profit Estimate"
          value={peso(net)}
          icon={Coins}
          tone={net >= 0 ? "success" : "danger"}
          delta={{
            text: revenue
              ? `${((net / revenue) * 100).toFixed(1)}% net margin${summary.sharedLeftOut ? ", before shared bills" : ""}`
              : "No sales in this period",
            kind: net >= 0 ? "neutral" : "alert",
          }}
        />
      </section>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
        <div>
          <h2 className="text-[15px] font-semibold">Net profit estimate</h2>
          <p className="text-xs text-muted-foreground">Net profit = Revenue − Cost of goods sold − Operating expenses</p>
        </div>
        <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
          <Term label="Revenue" value={peso(revenue)} sub="Completed sales" />
          <Op>−</Op>
          <Term label="Cost of goods sold" value={peso(costOfGoodsSold)} sub="Recipe cost of what sold" />
          <Op>−</Op>
          <Term label="Operating expenses" value={peso(summary.total)} sub="From this page" />
          <Op>=</Op>
          <Term label="Net profit" value={peso(net)} sub={revenue ? `${((net / revenue) * 100).toFixed(1)}% of revenue` : "—"} highlight={net >= 0 ? "good" : "bad"} />
        </div>
        {summary.sharedLeftOut > 0 && (
          <p className="text-xs text-muted-foreground">
            {peso(summary.sharedLeftOut)} of shared bills (covering both businesses) isn&apos;t included here. Switch to All to see it.
          </p>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
          <ExpensesManager expenses={summary.list} />
        </section>
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
          <div>
            <h2 className="text-[15px] font-semibold">By category</h2>
            <p className="text-xs text-muted-foreground">This period</p>
          </div>
          {summary.byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses yet.</p>
          ) : (
            summary.byCategory.map((c) => (
              <div key={c.category} className="flex flex-col gap-1.5">
                <p className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{c.category}</span>
                  <span className="font-semibold tabular-nums">{peso(c.amount)}</span>
                </p>
                <div className="h-2 rounded-full bg-neutral-soft" aria-hidden>
                  <div className="h-2 rounded-full bg-chart-1" style={{ width: `${(c.amount / largest.amount) * 100}%` }} />
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function Term({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: "good" | "bad" }) {
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-[10px] p-4", highlight === "good" ? "bg-success-soft" : highlight === "bad" ? "bg-destructive-soft" : "bg-secondary")}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="text-xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  );
}

function Op({ children }: { children: string }) {
  return (
    <span className="hidden text-center text-xl font-bold text-muted-foreground sm:block" aria-hidden>
      {children}
    </span>
  );
}
