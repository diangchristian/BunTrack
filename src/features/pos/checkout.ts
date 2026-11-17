import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { RecipeLine } from "@/features/inventory/types";
import { ingredientsNeeded } from "@/features/inventory/movements";
import { toDbDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { piecesToDeduct, toReceipt } from "./service";
import type { PaymentMethod, Receipt } from "./types";

export type SaleLine = {
  productId: string;
  /** Snapshots: what the line was called, which category, and its price and cost at this moment. */
  name: string;
  categoryId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  /** Pieces handed out per order (2 for Buy 1 Take 1): the recipe is deducted per piece. */
  pieces: number;
};

export type Sale = {
  clientRequestId: string;
  cashierId: string;
  method: PaymentMethod;
  /** Centavos handed over; the total for GCash. */
  amountReceived: number;
  /** The Manila calendar day and the moment of sale, from one clock read so they always agree. */
  date: string;
  completedAt: Date;
  lines: SaleLine[];
};

type SaveResult = { ok: true; receipt: Receipt; duplicate: boolean } | { ok: false; shortOf: string };

/** Thrown inside the transaction to undo everything when an ingredient runs out. */
class OutOfStock extends Error {
  constructor(readonly itemName: string) {
    super(`Out of ${itemName}`);
  }
}

const orderForReceipt = { number: true, completedAt: true, method: true, amountReceived: true, lines: { select: { productId: true, name: true, quantity: true, unitPrice: true } } } as const;

/** The receipt of a sale already saved under this id, or null. Asked first, so a retry never takes a new order number. */
export async function savedSale(clientRequestId: string) {
  const order = await db.order.findUnique({ where: { clientRequestId }, select: orderForReceipt });
  return order && toReceipt(order);
}

/**
 * Saves a priced sale: the order with its line snapshots, the stock deduction for every recipe
 * ingredient, and one "sale" movement per ingredient. One transaction, so either all of it is
 * saved or none of it is.
 *
 * - Two tills selling the last patty: each deduction only succeeds WHERE quantity >= needed,
 *   and the row lock makes the second one wait and then find too little. That sale is undone.
 * - A double tap or a retry sends the same clientRequestId: the unique index refuses a second
 *   order, and the first one's receipt is returned instead. Stock is deducted once.
 * - Rows are locked in item-id order, so two tills whose carts list shared ingredients in a
 *   different order wait for each other instead of deadlocking.
 */
export async function saveSale(sale: Sale): Promise<SaveResult> {
  try {
    const order = await db.$transaction(async (tx) => {
      // Only the cart's recipes, read at the moment of sale. Recipes are per piece (B1T1 = 2 pieces).
      const lines = await tx.recipeLine.findMany({ where: { productId: { in: sale.lines.map((l) => l.productId) } } });
      const recipes: Record<string, RecipeLine[]> = {};
      for (const { productId, ...line } of lines) (recipes[productId] ??= []).push(line);
      const needed = ingredientsNeeded(piecesToDeduct(sale.lines, sale.lines.map((l) => ({ id: l.productId, pieces: l.pieces }))), recipes);

      // Two round trips however many ingredients: lock the rows in id order, then deduct them all.
      const ids = [...needed.keys()];
      const amounts = [...needed.values()];
      await tx.$queryRaw`SELECT 1 FROM "inventoryItem" WHERE "id" = ANY(${ids}::text[]) ORDER BY "id" FOR UPDATE`;
      const deducted = await tx.$queryRaw<{ id: string }[]>`
        UPDATE "inventoryItem" i SET "quantity" = i."quantity" - v.amount, "updatedAt" = now()
        FROM unnest(${ids}::text[], ${amounts}::int[]) AS v(id, amount)
        WHERE i."id" = v.id AND i."quantity" >= v.amount
        RETURNING i."id"`;
      if (deducted.length < ids.length) {
        const shortId = ids.find((id) => !deducted.some((d) => d.id === id))!;
        const item = await tx.inventoryItem.findUnique({ where: { id: shortId }, select: { name: true } });
        throw new OutOfStock(item?.name ?? "a removed item");
      }
      // The order after the stock: a short ingredient undoes the sale before it takes an order
      // number (Postgres never hands a used number back). A repeat fails here on the unique
      // clientRequestId, and its stock deduction is undone with it.
      const created = await tx.order.create({
        data: {
          clientRequestId: sale.clientRequestId,
          completedAt: sale.completedAt,
          date: toDbDate(sale.date),
          cashierId: sale.cashierId,
          method: sale.method,
          amountReceived: sale.amountReceived,
          lines: { create: sale.lines.map(({ pieces: _pieces, ...line }) => line) },
        },
        select: { id: true, ...orderForReceipt },
      });

      await tx.stockMovement.createMany({
        data: [...needed].map(([itemId, amount]) => ({
          itemId,
          type: "sale" as const,
          change: -amount,
          orderId: created.id,
          date: toDbDate(sale.date),
          recordedById: sale.cashierId,
        })),
      });

      return created;
      // May wait on another till's row locks: allow more than Prisma's default 5 s before giving
      // up (and undoing everything).
    }, { maxWait: 5_000, timeout: 15_000 });
    return { ok: true, receipt: toReceipt(order), duplicate: false };
  } catch (error) {
    // The same sale arrived twice at once and the other request saved it: here that shows up as a
    // unique-id clash, or as "out of stock" when the other one took the last of something.
    if (error instanceof OutOfStock || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      const saved = await savedSale(sale.clientRequestId);
      if (saved) return { ok: true, receipt: saved, duplicate: true };
      if (error instanceof OutOfStock) return { ok: false, shortOf: error.itemName };
    }
    throw error;
  }
}
