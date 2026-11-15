"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { logActivity } from "@/features/activity/log";
import { canUseStore } from "@/features/auth/queries";
import { formatCentavos } from "@/lib/format";
import { inventoryStore } from "@/features/inventory/store";
import { priceSchema, productFormSchema } from "./schemas";
import { productStore } from "./store";

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
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const id = formData.get("id");
  if (typeof id === "string" && id) {
    const before = productStore.list().find((p) => p.id === id);
    if (!before || !productStore.update(id, parsed.data)) return { error: "This product no longer exists." };
    const changes = [
      before.price !== parsed.data.price && `Price ${formatCentavos(before.price)} → ${formatCentavos(parsed.data.price)}`,
      before.available !== parsed.data.available && (parsed.data.available ? "Switched on for sale" : "Switched off"),
      before.name !== parsed.data.name && `Renamed from ${before.name}`,
      before.category !== parsed.data.category && `Category ${before.category} → ${parsed.data.category}`,
      before.pieces !== parsed.data.pieces && (parsed.data.pieces === 2 ? "Now Buy 1 Take 1" : "No longer Buy 1 Take 1"),
    ].filter(Boolean);
    await logActivity({
      module: "Products",
      action: before.price !== parsed.data.price ? "Price updated" : "Product updated",
      record: parsed.data.name,
      change: changes.join(" · ") || "Details edited",
    });
  } else {
    const created = productStore.create(parsed.data);
    if (created.category === "iceCream") {
      // Dan Eric items are resold as-is: give the product its own stock item and a 1-unit recipe.
      // It starts at 0 on hand (sold out) and gets its dealer price from the first Stock In.
      const item = inventoryStore.addItem({ name: created.name, category: "Ice Cream (Dan Eric)", unit: "pcs", quantity: 0, minimum: 0, unitCost: 0 });
      inventoryStore.setRecipe(created.id, [{ itemId: item.id, quantity: 1 }]);
    }
    await logActivity({ module: "Products", action: "Product created", record: created.name, change: formatCentavos(created.price) });
  }

  refresh();
  return { ok: true };
}

export async function archiveProduct(id: string): Promise<ProductFormState> {
  if (!(await canUseStore())) return { error: "You don't have permission to change products." };
  const product = productStore.list().find((p) => p.id === id);
  if (!product || !productStore.archive(id)) return { error: "This product no longer exists." };
  await logActivity({ module: "Products", action: "Product archived", record: product.name });
  refresh();
  return { ok: true };
}

/** Costing & Pricing → Save price. `price` is the pesos text the user typed ("149.50"), validated here. */
export async function updateProductPrice(id: string, price: unknown): Promise<ProductFormState> {
  if (!(await canUseStore())) return { error: "You don't have permission to change prices." };
  const parsed = priceSchema.safeParse(typeof price === "string" ? price : "");
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const before = productStore.list().find((p) => p.id === id);
  if (!before || !productStore.update(id, { price: parsed.data })) return { error: "This product no longer exists." };
  await logActivity({ module: "Products", action: "Price updated", record: before.name, change: `${formatCentavos(before.price)} → ${formatCentavos(parsed.data)}` });
  refresh();
  return { ok: true };
}
