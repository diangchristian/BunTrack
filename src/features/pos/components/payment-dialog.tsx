"use client";

import { useState, useTransition } from "react";
import { Banknote, CreditCard, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCentavos } from "@/lib/format";
import { cn } from "@/lib/utils";
import { completeOrder } from "../actions";
import { changeDue, orderTotals, quickCashOptions } from "../pricing";
import type { OrderType, PaymentMethod, Receipt } from "../types";
import type { OrderLine } from "./order-panel";

const methods = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "gcash", label: "GCash", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
] as const;

export function PaymentDialog({
  open,
  onOpenChange,
  lines,
  orderType,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: OrderLine[];
  orderType: OrderType;
  onPaid: (receipt: Receipt) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Mounted only while open, so each payment starts with a fresh form. */}
        <PaymentForm lines={lines} orderType={orderType} onPaid={onPaid} onBack={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({
  lines,
  orderType,
  onPaid,
  onBack,
}: {
  lines: OrderLine[];
  orderType: OrderType;
  onPaid: (receipt: Receipt) => void;
  onBack: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cashInput, setCashInput] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const { itemCount, total } = orderTotals(lines.map((l) => ({ unitPrice: l.product.price, quantity: l.quantity })));
  const received = Math.round(Number(cashInput) * 100) || 0;
  const short = method === "cash" && received < total;

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await completeOrder({
        orderType,
        method,
        amountReceived: method === "cash" ? received : 0,
        lines: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      });
      if (result.ok) onPaid(result.receipt);
      else setError(result.error);
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">Collect Payment</DialogTitle>
        <DialogDescription>
          {orderType === "dine-in" ? "Dine-in" : "Takeout"} · {itemCount} {itemCount === 1 ? "item" : "items"}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col items-center gap-0.5 rounded-[14px] bg-brand-soft p-4">
        <span className="text-xs font-semibold text-brand-strong">Amount Due</span>
        <span className="text-[28px] leading-9 font-bold tabular-nums">{formatCentavos(total)}</span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-muted-foreground" id="method-label">
          Payment Method
        </span>
        <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="method-label">
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
            <Label htmlFor="cash-received" className="text-xs font-semibold text-muted-foreground">
              Amount Received (₱)
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
                  className={cn("h-9 flex-1", received === amount && "border-primary bg-brand-soft text-brand-strong")}
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
        <Button type="button" variant="success" className="h-11 font-semibold" onClick={submit} disabled={short || pending}>
          {pending ? "Completing…" : "Complete Payment"}
        </Button>
      </DialogFooter>
    </>
  );
}
