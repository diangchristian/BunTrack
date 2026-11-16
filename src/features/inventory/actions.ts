"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { formText } from "@/lib/forms";
import { logActivity } from "@/features/activity/log";
import { canUseStore, getCurrentUser } from "@/features/auth/queries";
import { toDbDate as asDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatQuantity } from "./costing";
import { planMovement, type MovementInput } from "./movements";
import { movementTypeToDb, toInventoryItem } from "./queries";
import { itemFormSchema, movementFormSchema, openingStockIn } from "./schemas";
import { units } from "./types";

export type InventoryFormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> };

const CHANGED = "Someone just changed this item's stock. Check the amount and try again.";

/** The ledger row for a planned movement: one place that decides what a movement records. */
function movementRow(itemId: string, input: MovementInput, plan: Extract<ReturnType<typeof planMovement>, { ok: true }>, recordedById: string) {
  return {
    itemId,
    type: movementTypeToDb[input.type],
    change: plan.change,
    unitCost: plan.unitCost ?? null,
    reference: plan.reference ?? null,
    supplier: plan.supplier ?? null,
    note: plan.note ?? null,
    date: asDate(input.date),
    recordedById,
  };
}

/**
 * Applies one Stock In / adjustment / waste: the item's quantity and its movement row change
 * together in one transaction, or not at all. Returns the quantity before and after.
 */
async function applyMovement(input: MovementInput, recordedById: string) {
  return db.$transaction(async (tx) => {
    const row = await tx.inventoryItem.findFirst({ where: { id: input.itemId, archivedAt: null } });
    if (!row) return { ok: false as const, error: "This item no longer exists." };
    const plan = planMovement(input, toInventoryItem(row));
    if (!plan.ok) return plan;

    let after: number;
    if (input.type === "stock-in") {
      // increment is atomic, so a delivery recorded during a sale can't overwrite the sale's deduction.
      const updated = await tx.inventoryItem.update({
        where: { id: row.id },
        data: { quantity: { increment: plan.change }, ...(plan.unitCost !== undefined && { unitCost: plan.unitCost }) },
      });
      after = updated.quantity;
    } else {
      // Waste only succeeds while there's still enough (two people can't both throw away the last
      // kilo). An adjustment sets what was counted, but only if nothing sold in the meantime:
      // otherwise the sale's deduction would be overwritten and the ledger stop adding up.
      const { count } = await tx.inventoryItem.updateMany({
        where: input.type === "waste" ? { id: row.id, quantity: { gte: input.quantity } } : { id: row.id, quantity: row.quantity },
        data: input.type === "waste" ? { quantity: { decrement: input.quantity } } : { quantity: plan.newQuantity },
      });
      if (count === 0) return { ok: false as const, error: CHANGED };
      after = (await tx.inventoryItem.findUniqueOrThrow({ where: { id: row.id }, select: { quantity: true } })).quantity;
    }

    await tx.stockMovement.create({ data: movementRow(row.id, input, plan, recordedById) });
    // From what the database saved, so the activity log is right even if a sale landed in between.
    return { ok: true as const, before: after - plan.change, after };
  });
}

/** Stock In / Adjustment / Waste from the movement dialog. */
export async function recordStockMovement(_prev: InventoryFormState, formData: FormData): Promise<InventoryFormState> {
  if (!(await canUseStore())) return { error: "You don't have permission to change stock." };

  const row = await db.inventoryItem.findFirst({ where: { id: formText(formData, "itemId"), archivedAt: null } });
  if (!row) return { fieldErrors: { itemId: ["Pick an item"] } };
  const item = toInventoryItem(row);

  // Homemade items are counted per piece made, never by the pack.
  const parsed = movementFormSchema(item.unit, item.homemade ? undefined : item.packSize).safeParse(
    Object.fromEntries(["type", "itemId", "quantity", "totalPaid", "reference", "supplier", "note", "date"].map((k) => [k, formText(formData, k)])),
  );
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const user = await getCurrentUser();
  const { reference, supplier, note, ...rest } = parsed.data;
  const result = await applyMovement(
    { ...rest, reference: reference || undefined, supplier: supplier || undefined, note: note || undefined },
    user.id,
  );
  if (!result.ok) return { error: result.error };

  const label = { "stock-in": item.homemade ? "Batch made" : "Stock In", adjustment: "Stock adjusted", waste: "Waste recorded" }[rest.type];
  await logActivity({
    module: "Inventory",
    action: label,
    record: item.name,
    change: [`${formatQuantity(result.before, item.unit)} → ${formatQuantity(result.after, item.unit)}`, note].filter(Boolean).join(" · "),
  });
  refresh();
  return { ok: true };
}

/** Add item, optionally with what's on hand now (saved as its first Stock In). */
export async function addInventoryItem(_prev: InventoryFormState, formData: FormData): Promise<InventoryFormState> {
  if (!(await canUseStore())) return { error: "You don't have permission to add items." };

  const parsed = itemFormSchema.safeParse({
    ...Object.fromEntries(["name", "category", "unit", "minimum", "packSize"].map((k) => [k, formText(formData, k)])),
    homemade: formData.get("homemade"),
  });

  // "On hand now" is checked before anything is saved, so a mistake there doesn't leave half an item.
  // Its rules depend on the unit and pack size, so it can only be checked once those parse.
  const openingQuantity = formText(formData, "openingQuantity").trim();
  const openingTotal = formText(formData, "openingTotal").trim();
  const openingErrors: Record<string, string[] | undefined> = {};
  let opening: { quantity: number; unitCost?: number; date: string } | undefined;
  if (!openingQuantity && openingTotal) openingErrors.openingQuantity = ["Enter how much you have, or clear the total"];
  if (openingQuantity && parsed.success) {
    const result = openingStockIn(parsed.data.unit, parsed.data.homemade ? undefined : parsed.data.packSize, openingQuantity, openingTotal);
    if (result.success) opening = result.data;
    else {
      // Keyed by form field; "totalPaid" isn't in the parsed output type, so widen it.
      const errors: Record<string, string[] | undefined> = z.flattenError(result.error).fieldErrors;
      Object.assign(openingErrors, { openingQuantity: errors.quantity, openingTotal: errors.totalPaid });
    }
  }
  if (!parsed.success || Object.values(openingErrors).some(Boolean)) {
    return { fieldErrors: { ...(parsed.success ? {} : z.flattenError(parsed.error).fieldErrors), ...openingErrors } };
  }
  const { minimum, packSize, homemade, ...values } = parsed.data;
  const user = await getCurrentUser();

  // What's on hand now is recorded as the first Stock In, by the same rules as any other.
  const openingMove: MovementInput | undefined = opening && { type: "stock-in", itemId: "", ...opening, note: "On hand when added" };
  const openingPlan = openingMove && planMovement(openingMove, { quantity: 0, unit: values.unit, homemade });

  // The item and its opening stock are saved together, so a failure never leaves half of it.
  await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.create({
      data: {
        ...values,
        packSize: packSize ?? null,
        homemade,
        minimum: Math.round(minimum * units[values.unit].factor),
        // No cost until the first Stock In: cost always comes from what was actually paid.
        quantity: openingPlan?.ok ? openingPlan.newQuantity : 0,
        unitCost: (openingPlan?.ok && openingPlan.unitCost) || 0,
      },
    });
    if (openingMove && openingPlan?.ok) await tx.stockMovement.create({ data: movementRow(item.id, openingMove, openingPlan, user.id) });
  });

  await logActivity({ module: "Inventory", action: "Item added", record: values.name, change: values.category });
  if (opening) {
    await logActivity({
      module: "Inventory",
      action: homemade ? "Batch made" : "Stock In",
      record: values.name,
      change: `0 → ${formatQuantity(opening.quantity, values.unit)} · on hand when added`,
    });
  }
  refresh();
  return { ok: true };
}

const recipeSchema = z
  .array(z.object({ itemId: z.string().min(1), quantity: z.int().min(1, { error: "Every amount must be at least 1" }).max(1_000_000) }))
  .max(30)
  .refine((lines) => new Set(lines.map((l) => l.itemId)).size === lines.length, { error: "Each item can appear only once" });

/** Costing & Pricing → Save recipe. Quantities are per serving, in the item's small unit. */
export async function saveRecipe(productId: string, lines: unknown): Promise<InventoryFormState> {
  if (!(await canUseStore())) return { error: "You don't have permission to change recipes." };
  const product = await db.product.findFirst({ where: { id: productId, archivedAt: null }, select: { name: true } });
  if (!product) return { error: "This product no longer exists." };

  const parsed = recipeSchema.safeParse(lines);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const known = await db.inventoryItem.count({ where: { id: { in: parsed.data.map((l) => l.itemId) }, archivedAt: null } });
  if (known !== parsed.data.length) return { error: "One of the ingredients no longer exists." };

  // Replaced as a whole, in one transaction, so a product never ends up with half a recipe.
  await db.$transaction([
    db.recipeLine.deleteMany({ where: { productId } }),
    db.recipeLine.createMany({ data: parsed.data.map((l) => ({ productId, ...l })) }),
  ]);
  await logActivity({ module: "Costing", action: "Recipe updated", record: product.name, change: `${parsed.data.length} ingredient${parsed.data.length === 1 ? "" : "s"}` });
  refresh();
  return { ok: true };
}
