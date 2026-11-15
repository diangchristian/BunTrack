"use server";

import { refresh } from "next/cache";

import { getCurrentUser } from "@/features/auth/queries";
import { productStore } from "@/features/products/store";
import { getMenu } from "./queries";
import { checkoutSchema } from "./schemas";
import { checkoutOrder } from "./service";
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

  // Re-checks stock at the moment of sale, so two tills can't sell the last unit twice.
  if (!productStore.sell(result.order.lines)) return { ok: false, error: "An item just sold out. Check the order and try again." };
  refresh(); // the POS re-renders with the new stock counts

  // shortcut: the order itself is not saved yet, only ice cream stock is deducted (in memory).
  // Once the database exists, save the order, its lines, the payment and the stock
  // movements in one transaction here, keyed so a double-submit can't save twice.
  return {
    ok: true,
    receipt: {
      ...result.order,
      orderNumber: `#${nextOrderNumber++}`,
      completedAt: new Date().toISOString(),
      method: parsed.data.method,
    },
  };
}
