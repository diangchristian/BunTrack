"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { categoryLabel } from "@/features/products/types";
import { formatCentavos } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SalesReport } from "../report";

const sorts = [
  { id: "best", label: "Best-selling" },
  { id: "profit", label: "Most profitable" },
  { id: "least", label: "Least-selling" },
] as const;

export function ProductPerformance({ products }: { products: SalesReport["products"] }) {
  const [sort, setSort] = useState<(typeof sorts)[number]["id"]>("best");
  const rows = [...products].sort((a, b) => (sort === "profit" ? b.profit - a.profit : sort === "least" ? a.units - b.units : b.units - a.units));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Product performance</h2>
          <p className="text-xs text-muted-foreground">Profit uses each item&apos;s cost at the time it was sold</p>
        </div>
        <div className="flex gap-1 rounded-[10px] border bg-secondary p-1" role="group" aria-label="Sort products">
          {sorts.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={sort === s.id}
              onClick={() => setSort(s.id)}
              className={cn("h-8 rounded-md px-3 text-xs font-medium text-muted-foreground sm:text-sm", sort === s.id && "bg-background font-semibold text-foreground shadow-sm")}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No sales in this period.</p>
      ) : (
        <div className="overflow-hidden rounded-[10px] border">
          <Table>
            <TableHeader className="bg-secondary">
              <TableRow>
                <TableHead className="text-xs">Product</TableHead>
                <TableHead className="hidden text-xs md:table-cell">Category</TableHead>
                <TableHead className="text-right text-xs">Units sold</TableHead>
                <TableHead className="text-right text-xs">Revenue</TableHead>
                <TableHead className="hidden text-right text-xs sm:table-cell">Gross profit</TableHead>
                <TableHead className="hidden text-right text-xs lg:table-cell">Margin</TableHead>
                <TableHead className="hidden text-xs sm:table-cell">vs prev. period</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const change = p.previousUnits ? Math.round(((p.units - p.previousUnits) / p.previousUnits) * 100) : null;
                return (
                  <TableRow key={p.productId}>
                    <TableCell className="font-semibold">{p.name}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{categoryLabel(p.category)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{p.units}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCentavos(p.revenue)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatCentavos(p.profit)}</TableCell>
                    <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">
                      {p.revenue ? `${((p.profit / p.revenue) * 100).toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {change === null ? (
                        <Badge variant="brand">New</Badge>
                      ) : (
                        <Badge variant={change > 0 ? "success" : change < 0 ? "danger" : "neutral"}>
                          {change > 0 ? "▲" : change < 0 ? "▼" : "—"} {Math.abs(change)}%
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
