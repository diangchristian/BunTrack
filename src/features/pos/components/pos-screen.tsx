"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatCentavos } from "@/lib/format";
import type { Category } from "@/features/categories/types";
import type { Settings } from "@/features/settings/schemas";
import type { MenuProduct, Receipt } from "../types";
import { cartTotals, OrderPanel, type OrderLine } from "./order-panel";
import { PaymentDialog } from "./payment-dialog";
import { ProductGrid } from "./product-grid";
import { ReceiptDialog } from "./receipt-dialog";

export function PosScreen({ menu, categories, cashierName, shop }: { menu: MenuProduct[]; categories: Category[]; cashierName: string; shop: Settings }) {
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
      else next.set(productId, Math.min(quantity, menu.find((p) => p.id === productId)?.servingsLeft ?? 99));
      return next;
    });
  }

  function clearOrder() {
    const cleared = quantities;
    setQuantities(new Map());
    // One mis-tap shouldn't cost a whole order, and an undo is faster than a confirm dialog.
    toast("Order cleared", {
      id: "order-cleared",
      // Merge, so anything tapped in since the clear is kept.
      action: { label: "Undo", onClick: () => setQuantities((now) => new Map([...cleared, ...now])) },
    });
  }

  const { itemCount, total } = cartTotals(lines);

  function handlePaid(paid: Receipt) {
    toast.dismiss("order-cleared"); // an Undo after a sale would bring back an old order
    toast.success(`Order ${paid.orderNumber} completed`);
    setPaying(false);
    setReceipt(paid);
    setQuantities(new Map());
  }

  return (
    // From tablet width up, menu and order sit side by side. The page scrolls the menu; the order
    // column is sticky at screen height so it stays put. Phones stack them (with the bar below).
    <div className="flex flex-1 flex-col md:grid md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div>
          <h1 className="text-[22px] leading-[30px] font-bold">Point of Sale</h1>
          <p className="text-sm text-muted-foreground">Cashier: {cashierName}</p>
        </div>
        <ProductGrid menu={menu} categories={categories} quantities={quantities} onAdd={(id) => setQuantity(id, (quantities.get(id) ?? 0) + 1)} />
        {/* On phones the order panel sits under the whole menu, so keep the total and Charge in reach. */}
        {lines.length > 0 && (
          <div className="sticky bottom-0 z-20 -mx-4 mt-auto flex items-center gap-3 border-t bg-card px-4 py-3 shadow-[0_-2px_8px_rgb(31_26_23/0.06)] md:hidden">
            <a href="#current-order" className="min-w-0 flex-1 text-sm">
              <span className="block font-semibold">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
              <span className="text-xs text-muted-foreground underline">View order</span>
            </a>
            <Button variant="success" className="h-11 px-5 font-semibold" onClick={() => setPaying(true)}>
              Charge {formatCentavos(total)}
            </Button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-col border-t bg-card md:sticky md:top-16 md:h-[calc(100svh-4rem)] md:border-t-0 md:border-l">
        <OrderPanel
          lines={lines}
          onQuantityChange={setQuantity}
          onClear={clearOrder}
          onCharge={() => setPaying(true)}
        />
      </div>

      <PaymentDialog open={paying} onOpenChange={setPaying} lines={lines} onPaid={handlePaid} />
      <ReceiptDialog receipt={receipt} shop={shop} onNewOrder={() => setReceipt(null)} />
    </div>
  );
}
