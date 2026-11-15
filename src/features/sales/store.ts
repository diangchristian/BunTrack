import { inventoryStore } from "@/features/inventory/store";
import { costProduct } from "@/features/products/costing";
import { productStore } from "@/features/products/store";
import { manilaDate } from "@/lib/format";
import type { Order } from "./types";

export function createOrderStore(seed: Order[]) {
  let orders = [...seed];
  const numberOf = (o: Order) => Number(o.number.replace("#", ""));

  return {
    list: () => orders,

    /** The number the next saved order will get (for logging its stock movements first). */
    nextNumber: () => `#${orders.length ? Math.max(...orders.map(numberOf)) + 1 : 1001}`,

    /** Saves a completed sale under the number its stock movements were logged with (nextNumber). */
    add(order: Order) {
      if (orders.some((o) => o.number === order.number)) throw new Error(`Order ${order.number} is already saved`);
      orders = [...orders, order];
    },
  };
}

// shortcut: orders live in server memory and reset when the server restarts. Swap for an
// orders + order_lines table (saved in the same transaction as the stock movements) later.

/**
 * Demo history for the last 14 days so Sales & Reports has something to show.
 * Deterministic (seeded), priced at today's menu prices and recipe costs, and marked `sample`.
 */
function sampleOrders(today: string): Order[] {
  let seed = 20261116;
  const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];

  const items = inventoryStore.items();
  const products = productStore
    .list()
    .map((p) => ({ ...p, ...costProduct(p, inventoryStore.recipe(p.id), items) }))
    .filter((p) => p.available && p.hasRecipe); // only items the POS could really have sold
  const burgers = products.filter((p) => p.category !== "iceCream");
  // The sheet shows mostly Pints, Half Gallons, 1 Liters and 3.6 Liters selling.
  const iceCream = products.filter((p) => ["pint", "one-liter", "half-gallon", "three-six-liter"].includes(p.id));
  const line = (p: (typeof products)[number], quantity: number) => ({
    productId: p.id, name: p.name, category: p.category, quantity, unitPrice: p.price, unitCost: p.cost,
  });

  const orders: Order[] = [];
  let number = 1001;
  for (let back = 13; back >= 0; back--) {
    const date = new Date(Date.parse(`${today}T00:00:00Z`) - back * 86_400_000).toISOString().slice(0, 10);
    const weekend = [0, 5, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());
    const count = (weekend ? 26 : 18) + Math.floor(random() * 8);
    for (let i = 0; i < count; i++) {
      const lines = [line(pick(burgers), 1 + Math.floor(random() * 2))];
      if (random() < 0.45) lines.push(line(pick(burgers.filter((p) => p.id !== lines[0].productId)), 1));
      if (random() < 0.02) lines.push(line(pick(iceCream), 1)); // the odd mixed order
      // Spread from 10:00 to 21:00 Manila (UTC+8).
      const minutes = 120 + Math.floor((i / count) * 660);
      const completedAt = new Date(Date.parse(`${date}T00:00:00Z`) + minutes * 60_000).toISOString();
      orders.push({ number: `#${number++}`, completedAt, date, cashier: pick(["Maria Reyes", "Carlo Mendoza"]), method: random() < 0.82 ? "cash" : "gcash", lines, sample: true });
    }
    if (random() < 0.7) {
      const completedAt = new Date(Date.parse(`${date}T00:00:00Z`) + 9 * 3_600_000).toISOString();
      orders.push({ number: `#${number++}`, completedAt, date, cashier: "Maria Reyes", method: random() < 0.85 ? "cash" : "gcash", lines: [line(pick(iceCream), 1)], sample: true });
    }
  }
  return orders;
}

// Kept on globalThis so dev hot-reloads don't wipe sales (same trick as lib/db.ts).
const globalForStore = globalThis as unknown as { orderStore?: ReturnType<typeof createOrderStore> };
export const orderStore = (globalForStore.orderStore ??= createOrderStore(sampleOrders(manilaDate())));
