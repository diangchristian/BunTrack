"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { formatPeso } from "@/lib/format";
import type { DashboardData } from "../queries";

type TooltipRow = { label: string; value: string; color?: string };

function TooltipCard({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="grid min-w-36 gap-1 rounded-md border bg-background px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {row.color && <span className="size-2.5 rounded-[3px]" style={{ background: row.color }} />}
            {row.label}
          </span>
          <span className="font-semibold text-foreground tabular-nums">{row.value}</span>
        </p>
      ))}
    </div>
  );
}

const trendConfig = { revenue: { label: "Revenue", color: "var(--chart-1)" } } satisfies ChartConfig;

export function SalesTrendChart({ data }: { data: DashboardData["salesTrend"] }) {
  return (
    <ChartContainer config={trendConfig} className="aspect-auto h-60 w-full">
      <AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => (v ? `₱${v / 1000}k` : "₱0")}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--input)" }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as DashboardData["salesTrend"][number] | undefined;
            if (!active || !point) return null;
            return (
              <TooltipCard
                title={point.day}
                rows={[
                  { label: "Revenue", value: formatPeso(point.revenue) },
                  { label: "Orders", value: String(point.orders) },
                ]}
              />
            );
          }}
        />
        <Area
          dataKey="revenue"
          type="monotone"
          stroke="var(--color-revenue)"
          strokeWidth={2}
          fill="var(--color-revenue)"
          fillOpacity={0.12}
          activeDot={{ r: 5, stroke: "var(--background)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

const categoryColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function CategoryDonut({ data }: { data: DashboardData["salesByCategory"] }) {
  const total = data.reduce((sum, d) => sum + d.revenue, 0);
  // Colors follow the category, never its rank, so they stay stable as numbers change.
  const rows = data.map((d, i) => ({ ...d, color: categoryColors[i], fill: categoryColors[i], share: Math.round((d.revenue / total) * 100) }));

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative size-36 shrink-0">
        <ChartContainer config={{}} className="aspect-square size-36">
          <PieChart accessibilityLayer>
            <ChartTooltip
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
                if (!active || !row) return null;
                return (
                  <TooltipCard
                    title={row.label}
                    rows={[{ label: `${row.share}% of sales`, value: formatPeso(row.revenue), color: row.color }]}
                  />
                );
              }}
            />
            <Pie
              data={rows}
              dataKey="revenue"
              nameKey="label"
              innerRadius="66%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="var(--background)"
              strokeWidth={2}
            />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[15px] font-semibold">₱{(total / 1000).toFixed(1)}k</span>
          <span className="text-xs text-muted-foreground">this week</span>
        </div>
      </div>
      <ul className="flex min-w-40 flex-1 flex-col gap-2.5">
        {rows.map((row) => (
          <li key={row.category} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: row.color }} aria-hidden />
            <span className="flex-1 text-muted-foreground">{row.label}</span>
            <span className="font-semibold tabular-nums">{row.share}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const revExpConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  expenses: { label: "Expenses (COGS + operating)", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function RevenueExpensesChart({ data }: { data: DashboardData["revenueVsExpenses"] }) {
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(revExpConfig).map(([key, { label, color }]) => (
          <li key={key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: color }} aria-hidden />
            {label}
          </li>
        ))}
      </ul>
      <ChartContainer config={revExpConfig} className="aspect-auto h-56 w-full">
        <BarChart accessibilityLayer data={data} barGap={2} margin={{ left: 4, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => (v ? `₱${v}k` : "₱0")} />
          <ChartTooltip
            cursor={{ fill: "var(--muted)" }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as DashboardData["revenueVsExpenses"][number] | undefined;
              if (!active || !point) return null;
              return (
                <TooltipCard
                  title={point.month === "Nov" ? "Nov (month to date)" : point.month}
                  rows={[
                    { label: "Revenue", value: `₱${point.revenue}k`, color: revExpConfig.revenue.color },
                    { label: "Expenses", value: `₱${point.expenses}k`, color: revExpConfig.expenses.color },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
