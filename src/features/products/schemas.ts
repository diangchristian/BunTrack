import { z } from "zod";


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
  // Checked against the current category list in the action (the list is editable in Settings).
  category: z.string().trim().min(1, { error: "Pick a category" }),
  price: priceSchema,
  // Ice cream only: what Dan Eric charges per piece (the List sheet's "Net Price"). Blank = keep it.
  dealerPrice: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .pipe(pesos("the dealer's price").optional()),
  // An unchecked checkbox is simply missing from the form data.
  available: z.literal("on").nullish().transform((v) => v === "on"),
  b1t1: z.literal("on").nullish(),
  /**
   * The photo as a data URL (resized in the browser to ~512px), or "" to remove it.
   * shortcut: stored in the product row (Postgres); move to file storage if photos make the menu slow to load.
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
