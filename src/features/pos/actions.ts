"use server";

import { refresh } from "next/cache";

import { getCurrentUser } from "@/features/auth/queries";
import { inventoryStore } from "@/features/inventory/store";
import { productStore } from "@/features/products/store";
import { manilaDate } from "@/lib/format";
import { getMenu } from "./queries";
import { checkoutSchema } from "./schemas";
import { checkoutOrder, piecesToDeduct } from "./service";
import type { Receipt } from "./types";

// shortcut: in-memory counter, resets when the server restarts and isn't shared
// between server instances. Use the database order id once orders are stored.
let nextOrderNumber = 1043;

export async function completeOrder(input: unknown): Promise<{ ok: true; receipt: Receipt } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "This order is invalid. Check the items and payment." };

  const result = checkoutOrder(await getMenu(), parsed.data);
  if (!result.ok) return result;

  // Re-checks stock at the moment of sale (two tills can't sell the last unit twice) and
  // deducts every recipe ingredient. All-or-nothing: a short ingredient deducts nothing.
  const orderNumber = `#${nextOrderNumber}`;
  const sale = inventoryStore.consume(piecesToDeduct(result.order.lines, productStore.list()), orderNumber, user.name, manilaDate());
  if (!sale.ok) return { ok: false, error: `Not enough ${sale.shortOf} for this order. Remove some items and try again.` };
  nextOrderNumber++;
  refresh(); // the POS re-renders with the new servings left

  // shortcut: the order itself is not saved yet; only the stock movements are (in memory).
  // Once the database exists, save the order, its lines, the payment and the stock
  // movements in one transaction here, keyed so a double-submit can't save twice.
  return {
    ok: true,
    receipt: {
      ...result.order,
      orderNumber,
      completedAt: new Date().toISOString(),
      method: parsed.data.method,
    },
  };
}
