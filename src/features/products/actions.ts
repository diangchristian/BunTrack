"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { canManageStore } from "@/features/auth/queries";
import { inventoryStore } from "@/features/inventory/store";
import { productFormSchema } from "./schemas";
import { productStore } from "./store";

export type ProductFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.input<typeof productFormSchema>, string[]>>;
};

/** Creates a product, or updates one when the form includes an id. */
export async function saveProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  if (!(await canManageStore())) return { error: "You don't have permission to change products." };

  const parsed = productFormSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    category: formData.get("category"),
    price: formData.get("price") ?? "",
    available: formData.get("available"),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const id = formData.get("id");
  if (typeof id === "string" && id) {
    if (!productStore.update(id, parsed.data)) return { error: "This product no longer exists." };
  } else {
    const created = productStore.create(parsed.data);
    if (created.category === "iceCream") {
      // Dan Eric items are resold as-is: give the product its own stock item and a 1-unit recipe.
      // It starts at 0 on hand (sold out) and gets its dealer price from the first Stock In.
      const item = inventoryStore.addItem({ name: created.name, category: "Ice Cream (Dan Eric)", unit: "pcs", quantity: 0, minimum: 0, unitCost: 0 });
      inventoryStore.setRecipe(created.id, [{ itemId: item.id, quantity: 1 }]);
    }
  }

  refresh();
  return { ok: true };
}

export async function archiveProduct(id: string): Promise<ProductFormState> {
  if (!(await canManageStore())) return { error: "You don't have permission to change products." };
  if (!productStore.archive(id)) return { error: "This product no longer exists." };
  refresh();
  return { ok: true };
}

/** Costing & Pricing → Save price. `price` is the pesos text the user typed ("149.50"), validated here. */
export async function updateProductPrice(id: string, price: unknown): Promise<ProductFormState> {
  if (!(await canManageStore())) return { error: "You don't have permission to change prices." };
  const parsed = productFormSchema.shape.price.safeParse(typeof price === "string" ? price : "");
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!productStore.update(id, { price: parsed.data })) return { error: "This product no longer exists." };
  refresh();
  return { ok: true };
}
