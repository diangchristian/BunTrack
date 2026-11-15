"use server";

import { refresh } from "next/cache";

import { getCurrentUser } from "@/features/auth/queries";
import { inventoryStore } from "@/features/inventory/store";
import { getProducts } from "@/features/products/queries";
import { orderStore } from "@/features/sales/store";
import { logActivity } from "@/features/activity/log";
import { formatCentavos, manilaDate } from "@/lib/format";
import { checkoutSchema } from "./schemas";
import { checkoutOrder, piecesToDeduct, toMenuProduct } from "./service";
import type { Receipt } from "./types";

export async function completeOrder(input: unknown): Promise<{ ok: true; receipt: Receipt } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "This order is invalid. Check the items and payment." };

  // Costed products (not getMenu) so each line's cost can be snapshotted on the order below.
  const products = await getProducts();
  const result = checkoutOrder(products.map(toMenuProduct), parsed.data);
  if (!result.ok) return result;

  // Everything below is synchronous, so no other sale can slip in between the stock check,
  // the deduction and saving the order.
  // Re-checks stock at the moment of sale (two tills can't sell the last unit twice) and
  // deducts every recipe ingredient. All-or-nothing: a short ingredient deducts nothing.
  const orderNumber = orderStore.nextNumber();
  const now = new Date(); // one clock read, so the order's day and time always agree
  const today = manilaDate(now);
  const sale = inventoryStore.consume(piecesToDeduct(result.order.lines, products), orderNumber, user.name, today);
  if (!sale.ok) return { ok: false, error: `Not enough ${sale.shortOf} for this order. Remove some items and try again.` };

  const completedAt = now.toISOString();
  orderStore.add({
    number: orderNumber,
    completedAt,
    date: today,
    cashier: user.name,
    method: parsed.data.method,
    // Price and cost as of now, so later price or recipe changes don't rewrite this sale.
    lines: result.order.lines.map((l) => {
      const product = products.find((p) => p.id === l.productId)!;
      return { productId: l.productId, name: l.name, category: product.category, quantity: l.quantity, unitPrice: product.price, unitCost: product.cost };
    }),
  });
  await logActivity({ module: "POS", action: "Completed order", record: `Order ${orderNumber}`, change: `${formatCentavos(result.order.total)} · ${parsed.data.method === "cash" ? "Cash" : "GCash"}` });
  refresh(); // the POS re-renders with the new servings left

  // shortcut: orders and stock movements are kept in memory. Once the database exists,
  // save the order, its lines, the payment and the stock movements in one transaction,
  // keyed so a double-submit can't save twice.
  return {
    ok: true,
    receipt: {
      ...result.order,
      orderNumber,
      completedAt,
      method: parsed.data.method,
    },
  };
}
