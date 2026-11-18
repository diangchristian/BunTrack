"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCentavos } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SalesReport } from "../report";

const methods = [
  { id: "all", label: "All payments" },
  { id: "cash", label: "Cash" },
  { id: "gcash", label: "GCash" },
] as const;
const PAGE = 25;

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }).format(new Date(iso));

export function TransactionHistory({ transactions }: { transactions: SalesReport["transactions"] }) {
  const [method, setMethod] = useState<(typeof methods)[number]["id"]>("all");
  const [shown, setShown] = useState(PAGE);
  const rows = transactions.filter((t) => method === "all" || t.method === method);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Transaction history</h2>
          <p className="text-xs text-muted-foreground">{rows.length} orders, newest first</p>
        </div>
        <div className="flex gap-1 rounded-[10px] border bg-secondary p-1" role="group" aria-label="Payment method">
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={method === m.id}
              onClick={() => (setMethod(m.id), setShown(PAGE))}
              className={cn("h-8 rounded-md px-3 text-xs font-medium text-muted-foreground sm:text-sm", method === m.id && "bg-background font-semibold text-foreground shadow-sm")}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No orders in this period.</p>
      ) : (
        <div className="overflow-hidden rounded-[10px] border">
          <Table className="table-fixed">
            <TableHeader className="bg-secondary">
              <TableRow>
                <TableHead className="w-20 text-xs">Order</TableHead>
                <TableHead className="w-36 text-xs">Date &amp; time</TableHead>
                <TableHead className="hidden w-32 text-xs lg:table-cell">Cashier</TableHead>
                <TableHead className="hidden w-20 text-xs md:table-cell">Payment</TableHead>
                <TableHead className="hidden text-xs sm:table-cell">Items</TableHead>
                <TableHead className="w-24 text-right text-xs">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, shown).map((t) => (
                <TableRow key={t.number}>
                  <TableCell className="font-semibold">
                    {t.number}
                    {t.sample && <span className="sr-only"> (sample)</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{when(t.completedAt)}</TableCell>
                  <TableCell className="hidden truncate lg:table-cell">{t.cashier}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={t.method === "cash" ? "neutral" : "brand"}>{t.method === "cash" ? "Cash" : "GCash"}</Badge>
                  </TableCell>
                  <TableCell className="hidden truncate text-muted-foreground sm:table-cell" title={t.summary}>
                    {t.summary}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCentavos(t.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {rows.length > shown && (
        <Button variant="outline" className="self-center" onClick={() => setShown(shown + PAGE)}>
          Show {Math.min(PAGE, rows.length - shown)} more
        </Button>
      )}
    </div>
  );


  
}
