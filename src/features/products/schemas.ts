import { z } from "zod";

import { categories, type CategoryId } from "./types";

/** "149" or "149.50" (pesos, up to 2 decimals) to integer centavos; null if malformed. */
export function parsePesos(value: string): number | null {
  const trimmed = value.trim();
  return /^\d{1,6}(\.\d{1,2})?$/.test(trimmed) ? Math.round(Number(trimmed) * 100) : null;
}

export const pesos = (label: string) =>
  z.string().transform((value, ctx) => {
    const centavos = parsePesos(value);
    if (centavos === null) {
      ctx.addIssue({ code: "custom", message: `Enter ${label} like 149 or 149.50` });
      return z.NEVER;
    }
    return centavos;
  });

export const priceSchema = pesos("a price").refine((v) => v > 0, { error: "Price must be more than ₱0" });

export const productFormSchema = z
  .object({
  name: z.string().trim().min(1, { error: "Enter a product name" }).max(60, { error: "Keep the name under 60 characters" }),
  description: z.string().trim().max(120, { error: "Keep the description under 120 characters" }),
  category: z.enum(categories.map((c) => c.id) as [CategoryId, ...CategoryId[]], { error: "Pick a category" }),
  price: priceSchema,
  // An unchecked checkbox is simply missing from the form data.
  available: z.literal("on").nullish().transform((v) => v === "on"),
  b1t1: z.literal("on").nullish(),
  /**
   * The photo as a data URL (resized in the browser to ~512px), or "" to remove it.
   * shortcut: stored with the product in memory; move to file storage with the database.
   */
  image: z
    .string()
    .max(700_000, { error: "That photo is too large. Try a smaller one." })
    .refine((v) => v === "" || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v), {
      error: "Use a PNG, JPG or WebP photo",
    })
    .optional()
    .transform((v) => v || undefined),
})
  // Buy 1 Take 1 hands out 2 pieces per order.
  .transform(({ b1t1, ...values }) => ({ ...values, pieces: b1t1 === "on" ? 2 : 1 }));

export type ProductFormValues = z.infer<typeof productFormSchema>;
