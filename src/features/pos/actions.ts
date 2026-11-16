"use server";

import { refresh } from "next/cache";

import { logActivity } from "@/features/activity/log";
import { getCurrentUser } from "@/features/auth/queries";
import { listRecipes } from "@/features/inventory/queries";
import { getProducts } from "@/features/products/queries";
import { formatCentavos, manilaDate } from "@/lib/format";
import { saveSale } from "./checkout";
import { checkoutSchema } from "./schemas";
import { checkoutOrder, toMenuProduct } from "./service";
import type { Receipt } from "./types";

export async function completeOrder(input: unknown): Promise<{ ok: true; receipt: Receipt } | { ok: false; error: string }> {
  const user = await getCurrentUser(); // signed in, or redirected to /login

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "This order is invalid. Check the items and payment." };

  // Priced from the database, never from the browser: a tampered request can't change prices.
  // Costed products (not getMenu) so each line's cost can be snapshotted on the order.
  const [products, recipes] = await Promise.all([getProducts(), listRecipes()]);
  const priced = checkoutOrder(products.map(toMenuProduct), parsed.data);
  if (!priced.ok) return priced;

  const now = new Date(); // one clock read, so the order's day and time always agree
  const result = await saveSale(
    {
      clientRequestId: parsed.data.clientRequestId,
      cashierId: user.id,
      method: parsed.data.method,
      amountReceived: priced.order.received,
      date: manilaDate(now),
      completedAt: now,
      lines: priced.order.lines.map((l) => {
        const product = products.find((p) => p.id === l.productId)!;
        // Price and cost as of now, so later price or recipe changes don't rewrite this sale.
        return { productId: l.productId, name: l.name, categoryId: product.category, quantity: l.quantity, unitPrice: product.price, unitCost: product.cost, pieces: product.pieces };
      }),
    },
    recipes,
  );
  if (!result.ok) return { ok: false, error: `Not enough ${result.shortOf} for this order. Remove some items and try again.` };

  // A repeat of a sale that's already saved gets its receipt back, but isn't logged twice.
  if (!result.duplicate) {
    await logActivity({ module: "POS", action: "Completed order", record: `Order ${result.receipt.orderNumber}`, change: `${formatCentavos(result.receipt.total)} · ${parsed.data.method === "cash" ? "Cash" : "GCash"}` });
  }
  refresh(); // the POS re-renders with the new servings left
  return { ok: true, receipt: result.receipt };
}
