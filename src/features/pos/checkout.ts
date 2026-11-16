import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { RecipeLine } from "@/features/inventory/types";
import { ingredientsNeeded } from "@/features/inventory/movements";
import { toDbDate as asDate } from "@/lib/dates";
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
export async function saveSale(sale: Sale, recipes: Record<string, RecipeLine[]>): Promise<SaveResult> {
  const existing = await db.order.findUnique({ where: { clientRequestId: sale.clientRequestId }, select: orderForReceipt });
  if (existing) return { ok: true, receipt: toReceipt(existing), duplicate: true };

  // Buy 1 Take 1 hands out 2 pieces per order, and recipes are per piece.
  const needed = ingredientsNeeded(piecesToDeduct(sale.lines, sale.lines.map((l) => ({ id: l.productId, pieces: l.pieces }))), recipes);

  try {
    const order = await db.$transaction(async (tx) => {
      // The order first: a concurrent duplicate fails here, before any stock moves.
      const created = await tx.order.create({
        data: {
          clientRequestId: sale.clientRequestId,
          completedAt: sale.completedAt,
          date: asDate(sale.date),
          cashierId: sale.cashierId,
          method: sale.method,
          amountReceived: sale.amountReceived,
          lines: { create: sale.lines.map(({ pieces: _pieces, ...line }) => line) },
        },
        select: { id: true },
      });

      for (const [itemId, amount] of [...needed].sort(([a], [b]) => a.localeCompare(b))) {
        const { count } = await tx.inventoryItem.updateMany({
          where: { id: itemId, quantity: { gte: amount } },
          data: { quantity: { decrement: amount } },
        });
        if (count === 0) {
          const item = await tx.inventoryItem.findUnique({ where: { id: itemId }, select: { name: true } });
          throw new OutOfStock(item?.name ?? "a removed item");
        }
      }
      await tx.stockMovement.createMany({
        data: [...needed].map(([itemId, amount]) => ({
          itemId,
          type: "sale" as const,
          change: -amount,
          orderId: created.id,
          date: asDate(sale.date),
          recordedById: sale.cashierId,
        })),
      });

      return tx.order.findUniqueOrThrow({ where: { id: created.id }, select: orderForReceipt });
      // A combo can touch a dozen ingredients, each a round trip, and may wait on another till's
      // row locks: allow more than Prisma's default 5 s before giving up (and undoing everything).
    }, { maxWait: 5_000, timeout: 15_000 });
    return { ok: true, receipt: toReceipt(order), duplicate: false };
  } catch (error) {
    if (error instanceof OutOfStock) return { ok: false, shortOf: error.itemName };
    // The same sale arrived twice at the same moment: the other request saved it, so return that one.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const saved = await db.order.findUnique({ where: { clientRequestId: sale.clientRequestId }, select: orderForReceipt });
      if (saved) return { ok: true, receipt: toReceipt(saved), duplicate: true };
    }
    throw error;
  }
}
