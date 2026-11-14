"use client";

import { Check, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCentavos } from "@/lib/format";
import type { Receipt } from "../types";

const methodLabels = { cash: "Cash", gcash: "GCash", card: "Card" };

export function ReceiptDialog({ receipt, onNewOrder }: { receipt: Receipt | null; onNewOrder: () => void }) {
  return (
    <Dialog open={receipt !== null} onOpenChange={(open) => !open && onNewOrder()}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        {receipt && (
          <>
            <DialogHeader className="items-center text-center">
              <span className="mb-1 flex size-14 items-center justify-center rounded-full bg-success-soft text-success-strong">
                <Check className="size-7" aria-hidden />
              </span>
              <DialogTitle className="text-lg font-bold">Payment complete</DialogTitle>
              <DialogDescription>
                Order {receipt.orderNumber} · {methodLabels[receipt.method]}
                {receipt.change > 0 && ` · Change ${formatCentavos(receipt.change)}`}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2 rounded-[10px] border bg-secondary p-4 text-xs">
              <div>
                <p className="text-sm font-semibold">Bun &amp; Patty Burger House</p>
                <p className="text-muted-foreground">
                  {new Date(receipt.completedAt).toLocaleString("en-PH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Manila",
                  })}{" "}
                  · {receipt.orderNumber} · {receipt.orderType === "dine-in" ? "Dine-in" : "Takeout"}
                </p>
              </div>
              <ul className="flex flex-col gap-1.5">
                {receipt.lines.map((line) => (
                  <li key={line.productId} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      {line.quantity}× {line.name}
                    </span>
                    <span className="tabular-nums">{formatCentavos(line.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-1.5 border-t border-input pt-2">
                <p className="flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCentavos(receipt.total)}</span>
                </p>
                <p className="flex justify-between text-muted-foreground">
                  <span>VAT included (12%)</span>
                  <span className="tabular-nums">{formatCentavos(receipt.vat)}</span>
                </p>
                <p className="flex justify-between">
                  <span>{methodLabels[receipt.method]}</span>
                  <span className="tabular-nums">{formatCentavos(receipt.received)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Change</span>
                  <span className="tabular-nums">{formatCentavos(receipt.change)}</span>
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button className="h-11 w-full font-semibold" onClick={onNewOrder} autoFocus>
                <Plus data-icon="inline-start" /> New Order
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
