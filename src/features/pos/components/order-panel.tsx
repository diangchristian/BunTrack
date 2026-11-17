"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCentavos } from "@/lib/format";
import { orderTotals } from "../pricing";
import type { MenuProduct } from "../types";
import { ProductImage } from "@/features/products/components/product-image";

export type OrderLine = { product: MenuProduct; quantity: number };

export function OrderPanel({
  lines,
  onQuantityChange,
  onClear,
  onCharge,
}: {
  lines: OrderLine[];
  onQuantityChange: (productId: string, quantity: number) => void;
  onClear: () => void;
  onCharge: () => void;
}) {
  const { itemCount, total } = orderTotals(lines.map((l) => ({ unitPrice: l.product.price, quantity: l.quantity })));

  return (
    <section id="current-order" aria-label="Current order" className="flex min-h-0 scroll-mt-16 flex-col bg-card">
      <div className="flex flex-col gap-3 px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Current order</h2>
            <p className="text-xs text-muted-foreground">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>
          <Button variant="ghost" onClick={onClear} disabled={lines.length === 0}>
            <Trash2 data-icon="inline-start" /> Clear
          </Button>
        </div>
      </div>

      {/* Not flex-1: Total and Charge follow the last item instead of the bottom of the screen. */}
      <div className="min-h-40 overflow-y-auto px-5">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <ShoppingBag className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm font-semibold">No items yet</p>
            <p className="text-xs text-muted-foreground">Tap a menu item to add it to the order.</p>
          </div>
        ) : (
          <ul>
            {lines.map(({ product, quantity }) => (
              <li key={product.id} className="flex gap-3 border-t py-3.5">
                <ProductImage product={product} sizes="56px" className="size-14" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div>
                    <p className="truncate text-sm font-semibold">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCentavos(product.price)} each</p>
                  </div>
                  <div className="flex w-fit items-center rounded-[10px] border border-input">
                    <button
                      type="button"
                      onClick={() => onQuantityChange(product.id, quantity - 1)}
                      aria-label={`Remove one ${product.name}`}
                      className="flex size-11 items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-9 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onQuantityChange(product.id, quantity + 1)}
                      disabled={quantity >= (product.servingsLeft ?? 99)}
                      aria-label={`Add one ${product.name}`}
                      className="flex size-11 items-center justify-center text-primary disabled:opacity-40"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <p className="text-sm font-semibold tabular-nums">{formatCentavos(product.price * quantity)}</p>
                  <button
                    type="button"
                    onClick={() => onQuantityChange(product.id, 0)}
                    aria-label={`Remove ${product.name} from order`}
                    className="flex size-11 items-center justify-center rounded-md border text-destructive hover:bg-destructive-soft"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2.5 border-t bg-secondary p-5">
        <p className="flex items-baseline justify-between">
          <span className="font-heading text-[15px] font-semibold">Total</span>
          <span className="text-[28px] leading-9 font-bold tabular-nums">{formatCentavos(total)}</span>
        </p>
        <Button variant="success" className="h-11 text-sm font-semibold" disabled={lines.length === 0} onClick={onCharge}>
          Charge {formatCentavos(total)}
        </Button>
      </div>
    </section>
  );
}
