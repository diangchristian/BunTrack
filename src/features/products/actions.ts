"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/features/auth/queries";
import { productFormSchema } from "./schemas";
import { productStore } from "./store";

export type ProductFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.input<typeof productFormSchema>, string[]>>;
};

async function canManageProducts() {
  const user = await getCurrentUser();
  // Cashiers sell; only the owner/manager changes the menu and prices.
  return user.role === "Administrator" || user.role === "Manager";
}

/** Creates a product, or updates one when the form includes an id. */
export async function saveProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  if (!(await canManageProducts())) return { error: "You don't have permission to change products." };

  const parsed = productFormSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    category: formData.get("category"),
    price: formData.get("price") ?? "",
    cost: formData.get("cost") ?? "",
    available: formData.get("available"),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const id = formData.get("id");
  if (typeof id === "string" && id) {
    if (!productStore.update(id, parsed.data)) return { error: "This product no longer exists." };
  } else {
    productStore.create(parsed.data);
  }

  refresh();
  return { ok: true };
}

export async function archiveProduct(id: string): Promise<ProductFormState> {
  if (!(await canManageProducts())) return { error: "You don't have permission to change products." };
  if (!productStore.archive(id)) return { error: "This product no longer exists." };
  refresh();
  return { ok: true };
}
