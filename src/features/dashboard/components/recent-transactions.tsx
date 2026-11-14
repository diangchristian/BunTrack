import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPeso } from "@/lib/format";
import type { DashboardData } from "../queries";
import { Panel } from "./panel";

const statusBadge = {
  completed: { variant: "success", label: "Completed" },
  voided: { variant: "danger", label: "Voided" },
  cancelled: { variant: "neutral", label: "Cancelled" },
} as const;

export function RecentTransactions({ rows }: { rows: DashboardData["recentTransactions"] }) {
  return (
    <Panel
      title="Recent Transactions"
      description="Live from the POS · today"
      action={
        <Link href="/reports" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          View all <ChevronRight data-icon="inline-end" />
        </Link>
      }
    >
      <div className="overflow-hidden rounded-[10px] border">
        <Table className="table-fixed">
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="w-20 text-xs">Order</TableHead>
              <TableHead className="w-20 text-xs">Time</TableHead>
              <TableHead className="hidden text-xs sm:table-cell">Items</TableHead>
              <TableHead className="hidden w-20 text-xs md:table-cell">Payment</TableHead>
              <TableHead className="w-24 text-right text-xs">Total</TableHead>
              <TableHead className="w-28 text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((tx) => {
              const status = statusBadge[tx.status];
              return (
                <TableRow key={tx.id}>
                  <TableCell className="font-semibold">{tx.id}</TableCell>
                  <TableCell className="text-muted-foreground">{tx.time}</TableCell>
                  <TableCell className="hidden truncate sm:table-cell" title={tx.items}>
                    {tx.items}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{tx.payment}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatPeso(tx.total, { cents: true })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Panel>
  );
}
