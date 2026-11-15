"use client";

import { useState } from "react";

import type { MenuProduct, Receipt } from "../types";
import { OrderPanel, type OrderLine } from "./order-panel";
import { PaymentDialog } from "./payment-dialog";
import { ProductGrid } from "./product-grid";
import { ReceiptDialog } from "./receipt-dialog";

export function PosScreen({ menu, cashierName }: { menu: MenuProduct[]; cashierName: string }) {
  // productId -> quantity, in the order items were first added
  const [quantities, setQuantities] = useState(new Map<string, number>());
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const lines: OrderLine[] = [...quantities].flatMap(([id, quantity]) => {
    const product = menu.find((p) => p.id === id);
    return product ? [{ product, quantity }] : [];
  });

  function setQuantity(productId: string, quantity: number) {
    setQuantities((prev) => {
      const next = new Map(prev);
      if (quantity <= 0) next.delete(productId);
      // Ice cream can't go above the units on hand; made items cap at 99 per order.
      else next.set(productId, Math.min(quantity, menu.find((p) => p.id === productId)?.stock ?? 99));
      return next;
    });
  }

  function handlePaid(paid: Receipt) {
    setPaying(false);
    setReceipt(paid);
    setQuantities(new Map());
  }

  return (
    <div className="flex flex-1 flex-col lg:grid lg:h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex flex-col gap-4 p-4 md:p-6 lg:overflow-y-auto">
        <div>
          <h1 className="text-[22px] leading-[30px] font-bold">Point of Sale</h1>
          <p className="text-sm text-muted-foreground">Cashier: {cashierName}</p>
        </div>
        <ProductGrid menu={menu} quantities={quantities} onAdd={(id) => setQuantity(id, (quantities.get(id) ?? 0) + 1)} />
      </div>

      <div className="flex min-h-0 flex-col border-t lg:border-t-0 lg:border-l">
        <OrderPanel
          lines={lines}
          onQuantityChange={setQuantity}
          onClear={() => setQuantities(new Map())}
          onCharge={() => setPaying(true)}
        />
      </div>

      <PaymentDialog open={paying} onOpenChange={setPaying} lines={lines} onPaid={handlePaid} />
      <ReceiptDialog receipt={receipt} onNewOrder={() => setReceipt(null)} />
    </div>
  );
}
