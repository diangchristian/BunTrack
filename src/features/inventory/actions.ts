"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { formText } from "@/lib/forms";
import { logActivity } from "@/features/activity/log";
import { canManageStore, getCurrentUser } from "@/features/auth/queries";
import { productStore } from "@/features/products/store";
import { itemFormSchema, movementFormSchema } from "./schemas";
import { inventoryStore } from "./store";
import { formatQuantity } from "./costing";
import { units } from "./types";

export type InventoryFormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> };

/** Stock In / Adjustment / Waste from the movement dialog. */
export async function recordStockMovement(_prev: InventoryFormState, formData: FormData): Promise<InventoryFormState> {
  if (!(await canManageStore())) return { error: "You don't have permission to change stock." };

  const item = inventoryStore.items().find((i) => i.id === formText(formData, "itemId"));
  if (!item) return { fieldErrors: { itemId: ["Pick an item"] } };

  const parsed = movementFormSchema(item.unit).safeParse(
    Object.fromEntries(["type", "itemId", "quantity", "unitCost", "reference", "supplier", "note", "date"].map((k) => [k, formText(formData, k)])),
  );
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const { name } = await getCurrentUser();
  const { reference, supplier, note, ...rest } = parsed.data;
  const result = inventoryStore.recordMovement(
    { ...rest, reference: reference || undefined, supplier: supplier || undefined, note: note || undefined },
    name,
  );
  if (!result.ok) return { error: result.error };

  const after = inventoryStore.items().find((i) => i.id === item.id)!;
  const label = { "stock-in": item.homemade ? "Batch made" : "Stock In", adjustment: "Stock adjusted", waste: "Waste recorded" }[rest.type];
  await logActivity({
    module: "Inventory",
    action: label,
    record: item.name,
    change: [`${formatQuantity(item.quantity, item.unit)} → ${formatQuantity(after.quantity, after.unit)}`, note].filter(Boolean).join(" · "),
  });
  refresh();
  return { ok: true };
}

export async function addInventoryItem(_prev: InventoryFormState, formData: FormData): Promise<InventoryFormState> {
  if (!(await canManageStore())) return { error: "You don't have permission to add items." };

  const parsed = itemFormSchema.safeParse(
    {
      ...Object.fromEntries(["name", "category", "unit", "unitCost", "minimum"].map((k) => [k, formText(formData, k)])),
      homemade: formData.get("homemade"),
    },
  );
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const { minimum, ...values } = parsed.data;
  // Starts at 0 on hand; record a Stock In to add the first delivery (so it's in the history).
  inventoryStore.addItem({ ...values, quantity: 0, minimum: Math.round(minimum * units[values.unit].factor) });
  await logActivity({ module: "Inventory", action: "Item added", record: values.name, change: values.category });
  refresh();
  return { ok: true };
}

const recipeSchema = z
  .array(z.object({ itemId: z.string().min(1), quantity: z.int().min(1, { error: "Every amount must be at least 1" }).max(1_000_000) }))
  .max(30)
  .refine((lines) => new Set(lines.map((l) => l.itemId)).size === lines.length, { error: "Each item can appear only once" });

/** Costing & Pricing → Save recipe. Quantities are per serving, in the item's small unit. */
export async function saveRecipe(productId: string, lines: unknown): Promise<InventoryFormState> {
  if (!(await canManageStore())) return { error: "You don't have permission to change recipes." };
  if (!productStore.list().some((p) => p.id === productId)) return { error: "This product no longer exists." };

  const parsed = recipeSchema.safeParse(lines);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const known = new Set(inventoryStore.items().map((i) => i.id));
  if (parsed.data.some((l) => !known.has(l.itemId))) return { error: "One of the ingredients no longer exists." };

  inventoryStore.setRecipe(productId, parsed.data);
  const product = productStore.list().find((p) => p.id === productId)!;
  await logActivity({ module: "Costing", action: "Recipe updated", record: product.name, change: `${parsed.data.length} ingredient${parsed.data.length === 1 ? "" : "s"}` });
  refresh();
  return { ok: true };
}
