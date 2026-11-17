"use client";

import { useState, useTransition } from "react";
import { Banknote, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCentavos } from "@/lib/format";
import { randomUuid } from "@/lib/uuid";
import { cn } from "@/lib/utils";
import { completeOrder } from "../actions";
import { changeDue, quickCashOptions } from "../pricing";
import type { PaymentMethod, Receipt } from "../types";
import { cartTotals, type OrderLine } from "./order-panel";

const methods = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "gcash", label: "GCash", icon: Smartphone },
] as const;

export function PaymentDialog({
  open,
  onOpenChange,
  lines,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: OrderLine[];
  onPaid: (receipt: Receipt) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Mounted only while open, so each payment starts with a fresh form. */}
        <PaymentForm lines={lines} onPaid={onPaid} onBack={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({
  lines,
  onPaid,
  onBack,
}: {
  lines: OrderLine[];
  onPaid: (receipt: Receipt) => void;
  onBack: () => void;
}) {
  // One id for this payment, sent with every attempt: a double tap or a retry can't save it twice.
  // PaymentForm mounts each time the dialog opens, so every payment gets a fresh one.
  const [clientRequestId] = useState(randomUuid);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cashInput, setCashInput] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const { itemCount, total } = cartTotals(lines);
  const received = Math.round(Number(cashInput) * 100) || 0;
  const short = method === "cash" && received < total;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (short || pending) return;
    setError(undefined);
    startTransition(async () => {
      const result = await completeOrder({
        clientRequestId,
        method,
        amountReceived: method === "cash" ? received : 0,
        expectedTotal: total,
        lines: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      });
      if (result.ok) onPaid(result.receipt);
      else setError(result.error);
    });
  }

  return (
    // A form, so pressing Enter in the cash field completes the payment.
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">Collect payment</DialogTitle>
        <DialogDescription>
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col items-center gap-0.5 rounded-[14px] bg-brand-soft p-4">
        <span className="text-xs font-semibold text-brand-strong">Amount due</span>
        <span className="text-[28px] leading-9 font-bold tabular-nums">{formatCentavos(total)}</span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-muted-foreground" id="method-label">
          Payment method
        </span>
        <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="method-label">
          {methods.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={method === id}
              onClick={() => setMethod(id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-[10px] border border-input p-3 text-sm font-semibold",
                method === id && "border-2 border-primary bg-brand-soft text-brand-strong",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      {method === "cash" && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cash-received" className="text-sm font-semibold text-muted-foreground">
              Amount received (₱)
            </Label>
            <Input
              id="cash-received"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              placeholder="0.00"
              className="h-11 px-3 text-base tabular-nums"
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              {quickCashOptions(total).map((amount, i) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  className={cn("h-11 flex-1", received === amount && "border-primary bg-brand-soft text-brand-strong")}
                  onClick={() => setCashInput(String(amount / 100))}
                >
                  {i === 0 ? "Exact" : formatCentavos(amount).replace(".00", "")}
                </Button>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "flex items-center justify-between rounded-[14px] p-4",
              short ? "bg-warning-soft text-warning" : "bg-success-soft text-success-strong",
            )}
            aria-live="polite"
          >
            <span className="font-heading text-[15px] font-semibold">{short ? "Short by" : "Change"}</span>
            <span className="text-[22px] font-bold tabular-nums">
              {formatCentavos(short ? total - received : changeDue(total, received))}
            </span>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-11" onClick={onBack} disabled={pending}>
          Back
        </Button>
        <Button type="submit" variant="success" className="h-11 font-semibold" disabled={short || pending}>
          {pending ? "Completing…" : "Complete payment"}
        </Button>
      </DialogFooter>
    </form>
  );
}
