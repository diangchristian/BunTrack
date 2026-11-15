"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { formatCentavos } from "@/lib/format";

const config = { revenue: { label: "Revenue", color: "var(--chart-1)" } } satisfies ChartConfig;
// ₱500, ₱1.5K, ₱12K: readable at any scale (axis values are centavos).
const compactPeso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 });
const dayLabel = (date: string, withWeekday = false) =>
  new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", weekday: withWeekday ? "short" : undefined, timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

export function RevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-60 w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(d: string) => dayLabel(d)} minTickGap={12} />
        <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => compactPeso.format(v / 100)} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as { date: string; revenue: number } | undefined;
            if (!active || !point) return null;
            return (
              <div className="grid min-w-36 gap-1 rounded-md border bg-background px-3 py-2 text-xs shadow-lg">
                <p className="text-muted-foreground">{dayLabel(point.date, true)}</p>
                <p className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-semibold tabular-nums">{formatCentavos(point.revenue)}</span>
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ChartContainer>
  );
}
