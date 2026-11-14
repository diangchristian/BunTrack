import { changeDue, orderTotals } from "./pricing";
import type { CheckoutInput } from "./schemas";
import type { MenuProduct } from "./types";

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

/**
 * Prices an order from the server's menu. The browser only sends product ids and
 * quantities, so a tampered request can't change prices or sell sold-out items.
 */
export function checkoutOrder(menu: MenuProduct[], input: CheckoutInput): CheckoutResult {
  const quantities = new Map<string, number>();
  for (const line of input.lines) {
    quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
  }

  const lines = [];
  for (const [productId, quantity] of quantities) {
    const product = menu.find((p) => p.id === productId);
    if (!product) return { ok: false, error: "An item in this order is no longer on the menu." };
    if (!product.available) return { ok: false, error: `${product.name} is unavailable right now.` };
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
