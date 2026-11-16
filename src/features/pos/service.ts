import { changeDue, orderTotals } from "./pricing";
import type { CheckoutInput } from "./schemas";
import { unavailableReason, type CostedProduct } from "@/features/products/types";
import { orderLabel } from "@/lib/dates";
import type { MenuProduct, PaymentMethod, Receipt } from "./types";

type CheckoutResult =
  | {
      ok: true;
      order: {
        lines: { productId: string; name: string; quantity: number; lineTotal: number }[];
        total: number;
        received: number;
        change: number;
      };
    }
  | { ok: false; error: string };

/** What the POS sees of a product: no cost, and a reason when it can't be sold. */
export function toMenuProduct(product: CostedProduct): MenuProduct {
  const { id, name, category, price, image, pieces, servingsLeft } = product;
  const reason = unavailableReason(product);
  return { id, name, category, price, image, pieces, servingsLeft, available: !reason, unavailableReason: reason };
}

/**
 * Prices an order from the server's menu. The browser only sends product ids and
 * quantities, so a tampered request can't change prices or sell sold-out items.
 */
export function checkoutOrder(menu: MenuProduct[], input: Omit<CheckoutInput, "clientRequestId">): CheckoutResult {
  const quantities = new Map<string, number>();
  for (const line of input.lines) {
    quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
  }

  const lines = [];
  for (const [productId, quantity] of quantities) {
    const product = menu.find((p) => p.id === productId);
    if (!product) return { ok: false, error: "An item in this order is no longer on the menu." };
    if (!product.available) return { ok: false, error: `${product.name} is unavailable right now.` };
    if (product.servingsLeft !== null && quantity > product.servingsLeft) {
      return { ok: false, error: `Only ${product.servingsLeft} ${product.name} left.` };
    }
    lines.push({ productId, name: product.name, quantity, unitPrice: product.price });
  }

  const { total } = orderTotals(lines);
  const received = input.method === "cash" ? input.amountReceived : total;
  if (received < total) return { ok: false, error: "Cash received is less than the total." };

  return {
    ok: true,
    order: {
      lines: lines.map(({ unitPrice, ...line }) => ({ ...line, lineTotal: unitPrice * line.quantity })),
      total,
      received,
      change: changeDue(total, received),
    },
  };
}

/** Order lines → recipe servings to deduct: a Buy 1 Take 1 order hands out 2 pieces. */
export function piecesToDeduct(lines: { productId: string; quantity: number }[], products: { id: string; pieces: number }[]) {
  return lines.map(({ productId, quantity }) => ({
    productId,
    quantity: quantity * (products.find((p) => p.id === productId)?.pieces ?? 1),
  }));
}

/** A saved order read back as the receipt the cashier sees: totals and change from its line snapshots. */
export function toReceipt(order: {
  number: number;
  completedAt: Date;
  method: PaymentMethod;
  amountReceived: number;
  lines: { productId: string; name: string; quantity: number; unitPrice: number }[];
}): Receipt {
  const lines = order.lines.map((l) => ({ productId: l.productId, name: l.name, quantity: l.quantity, lineTotal: l.quantity * l.unitPrice }));
  const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  return {
    orderNumber: orderLabel(order.number),
    completedAt: order.completedAt.toISOString(),
    method: order.method,
    lines,
    total,
    received: order.amountReceived,
    change: changeDue(total, order.amountReceived),
  };
}
