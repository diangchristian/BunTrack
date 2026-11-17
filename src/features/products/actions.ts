"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { logActivity } from "@/features/activity/log";
import { ICE_CREAM } from "@/features/categories/types";
import { DAN_ERIC } from "@/features/inventory/types";
import { canUseStore } from "@/features/auth/queries";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatCentavos } from "@/lib/format";
import { priceSchema, productFormSchema } from "./schemas";

const activeProduct = (id: string) => db.product.findFirst({ where: { id, archivedAt: null } });

/** Thrown inside the save transaction (undoing it) when the ice cream's name already belongs to another kind of item. */
class StockNameTaken extends Error {}

/**
 * Dan Eric items are resold as-is, so an ice cream product needs its own stock item and a 1-unit
 * recipe. Made when the product is created in Ice Cream or moved into it (if it has no recipe
 * yet). The dealer's price typed in the product form becomes that item's cost, like the List
 * sheet. Returns the dealer's price it replaced, or null when it didn't change.
 */
async function ensureDanEricStock(tx: Prisma.TransactionClient, product: { id: string; name: string; categoryId: string }, dealerPrice?: number) {
  if (product.categoryId !== ICE_CREAM) return null;
  const itemFields = { id: true, category: true, unitCost: true } as const;
  let item = (await tx.recipeLine.findFirst({ where: { productId: product.id }, select: { item: { select: itemFields } } }))?.item;
  if (!item) {
    // Reuse a Dan Eric item with this name if one is left over without a product. Any other item
    // with the name (e.g. "Ice" in Frozen) is a different thing: refuse rather than make a second
    // "1 Liter" and split its stock, or start selling 1 g of the shop's Ice.
    const sameName = await tx.inventoryItem.findFirst({ where: { name: { equals: product.name, mode: "insensitive" }, archivedAt: null }, select: { ...itemFields, unit: true } });
    if (sameName && (sameName.category !== DAN_ERIC || sameName.unit !== "pcs")) {
      throw new StockNameTaken(`There's already an inventory item called "${product.name}" (${sameName.category}). Rename one of them first.`);
    }
    item = sameName ?? (await tx.inventoryItem.create({ data: { name: product.name, category: DAN_ERIC, unit: "pcs" }, select: itemFields }));
    await tx.recipeLine.create({ data: { productId: product.id, itemId: item.id, quantity: 1 } });
  }
  // Only a Dan Eric item takes a dealer's price: a product moved into Ice Cream with a real recipe keeps its costs.
  if (dealerPrice === undefined || item.category !== DAN_ERIC || item.unitCost === dealerPrice) return null;
  await tx.inventoryItem.update({ where: { id: item.id }, data: { unitCost: dealerPrice } });
  return item.unitCost;
}

export type ProductFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.input<typeof productFormSchema>, string[]>>;
};

/** Creates a product, or updates one when the form includes an id. */
export async function saveProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  if (!(await canUseStore())) return { error: "You don't have permission to change products." };

  const parsed = productFormSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    category: formData.get("category"),
    price: formData.get("price") ?? "",
    available: formData.get("available"),
    b1t1: formData.get("b1t1"),
    image: formData.get("image") ?? "",
    dealerPrice: formData.get("dealerPrice") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (!(await db.category.findUnique({ where: { id: parsed.data.category } }))) {
    return { fieldErrors: { category: ["That category no longer exists. Pick another."] } };
  }

  const { category, image, dealerPrice, ...values } = parsed.data;
  const data = { ...values, categoryId: category, image: image || null };
  const formId = formData.get("id");
  const editing = typeof formId === "string" && formId ? formId : undefined;

  // Two products with one name split sales and stock between them (and confuse the POS).
  const sameName = await db.product.findFirst({
    where: { name: { equals: values.name, mode: "insensitive" }, archivedAt: null, ...(editing && { id: { not: editing } }) },
    select: { id: true },
  });
  if (sameName) return { fieldErrors: { name: ["There's already a product called that."] } };

  try {
    if (editing) {
      const found = await activeProduct(editing);
      if (!found) return { error: "This product no longer exists." };
      const oldDealerPrice = await db.$transaction(async (tx) => ensureDanEricStock(tx, await tx.product.update({ where: { id: editing }, data }), dealerPrice));
      const before = { ...found, category: found.categoryId };
      const changes = [
        before.price !== parsed.data.price && `Price ${formatCentavos(before.price)} → ${formatCentavos(parsed.data.price)}`,
        before.available !== parsed.data.available && (parsed.data.available ? "Switched on for sale" : "Switched off"),
        before.name !== parsed.data.name && `Renamed from ${before.name}`,
        before.category !== parsed.data.category && `Category ${before.category} → ${parsed.data.category}`,
        before.pieces !== parsed.data.pieces && (parsed.data.pieces === 2 ? "Now Buy 1 Take 1" : "No longer Buy 1 Take 1"),
        oldDealerPrice !== null && `Dealer's price ${formatCentavos(oldDealerPrice)} → ${formatCentavos(dealerPrice!)}`,
      ].filter(Boolean);
      await logActivity({
        module: "Products",
        action: before.price !== parsed.data.price ? "Price updated" : "Product updated",
        record: parsed.data.name,
        change: changes.join(" · ") || "Details edited",
      });
    } else {
      // The product and its Dan Eric stock are saved together.
      const created = await db.$transaction(async (tx) => {
        const product = await tx.product.create({ data });
        await ensureDanEricStock(tx, product, dealerPrice);
        return product;
      });
      const dealer = created.categoryId === ICE_CREAM && dealerPrice !== undefined ? ` · dealer's price ${formatCentavos(dealerPrice)}` : "";
      await logActivity({ module: "Products", action: "Product created", record: created.name, change: formatCentavos(created.price) + dealer });
    }
  } catch (e) {
    // The ice cream's name belongs to another kind of inventory item: nothing was saved.
    if (e instanceof StockNameTaken) return { fieldErrors: { name: [e.message] } };
    throw e;
  }

  refresh();
  return { ok: true };
}

export async function archiveProduct(id: string): Promise<ProductFormState> {
  if (!(await canUseStore())) return { error: "You don't have permission to change products." };
  const product = await activeProduct(id);
  if (!product) return { error: "This product no longer exists." };
  // Archived, not deleted: past orders and reports keep pointing at it.
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: { archivedAt: now } });
    // A Dan Eric product's own stock item goes with it, unless another product on sale still uses it.
    await tx.inventoryItem.updateMany({
      where: { category: DAN_ERIC, archivedAt: null, usedIn: { some: { productId: id }, none: { productId: { not: id }, product: { archivedAt: null } } } },
      data: { archivedAt: now },
    });
  });
  await logActivity({ module: "Products", action: "Product archived", record: product.name });
  refresh();
  return { ok: true };
}

/** Costing & Pricing → Save price. `price` is the pesos text the user typed ("149.50"), validated here. */
export async function updateProductPrice(id: string, price: unknown): Promise<ProductFormState> {
  if (!(await canUseStore())) return { error: "You don't have permission to change prices." };
  const parsed = priceSchema.safeParse(typeof price === "string" ? price : "");
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const before = await activeProduct(id);
  if (!before) return { error: "This product no longer exists." };
  await db.product.update({ where: { id }, data: { price: parsed.data } });
  await logActivity({ module: "Products", action: "Price updated", record: before.name, change: `${formatCentavos(before.price)} → ${formatCentavos(parsed.data)}` });
  refresh();
  return { ok: true };
}
