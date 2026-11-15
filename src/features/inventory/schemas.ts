import { z } from "zod";

import { parsePesos } from "@/features/products/schemas";
import { isRealPastDate, manilaDate } from "@/lib/format";
import { costFromPurchase } from "./costing";
import { itemCategories, units, type UnitId } from "./types";

const text = (max: number) => z.string().trim().max(max, { error: `Keep it under ${max} characters` });

/**
 * Typed amount → small units (pc, g, ml), or null if it isn't valid. With `packSize` the text is
 * a number of whole packs. Shared by the server checks and the live previews so they always agree.
 */
export function stockAmount(text: string, unit: UnitId, packSize?: number) {
  const value = text.trim();
  if (packSize !== undefined) return /^\d{1,6}$/.test(value) ? Number(value) * packSize : null;
  const pattern = unit === "pcs" ? /^\d{1,6}$/ : /^\d{1,6}(\.\d{1,3})?$/;
  return pattern.test(value) ? Math.round(Number(value) * units[unit].factor) : null;
}

/** "Each pack holds" text → small units, or null (pieces are whole; up to 5 digits). */
export function parsePackSize(text: string, unit: UnitId) {
  const value = text.trim();
  const pattern = unit === "pcs" ? /^\d{1,5}$/ : /^\d{1,5}(\.\d{1,3})?$/;
  const size = pattern.test(value) ? Math.round(Number(value) * units[unit].factor) : 0;
  return size > 0 ? size : null;
}

/**
 * Parses the Stock In / Adjustment / Waste form for an item measured in `unit`.
 * Stock In takes what's on the receipt: how many (packs, if the item is bought by the pack of
 * `packSize` small units) and the total paid. The cost per pc / kg / L is worked out here.
 */
export function movementFormSchema(unit: UnitId, packSize?: number) {
  const { label } = units[unit];
  return z
    .object({
      type: z.enum(["stock-in", "adjustment", "waste"]),
      itemId: z.string().min(1, { error: "Pick an item" }),
      quantity: z.string().trim(),
      totalPaid: z.string(),
      reference: text(40),
      supplier: text(60),
      note: text(120),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Pick a date" })
        // The browser's max= is only a hint; the server is the guard.
        .refine(isRealPastDate, { error: "Pick a real date, not in the future" }),
    })
    .transform((v, ctx) => {
      const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
      const byPack = v.type === "stock-in" && packSize !== undefined;
      const amount = stockAmount(v.quantity, unit, byPack ? packSize : undefined);

      if (amount === null) issue("quantity", byPack ? "Enter whole packs, like 3" : unit === "pcs" ? "Enter whole pieces, like 50" : `Enter ${label}, like 2.5`);
      else if (amount === 0 && v.type !== "adjustment") issue("quantity", "Enter more than 0");

      let unitCost: number | undefined;
      if (v.type === "stock-in") {
        // No reference check: market and store buys usually have no invoice or receipt number.
        const total = parsePesos(v.totalPaid);
        if (total === null) issue("totalPaid", "Enter the total you paid, like 450");
        // Free stock (₱0) is fine, but it says nothing about the price, so the cost stays as it was.
        else if (total > 0 && amount) unitCost = costFromPurchase(total, amount, unit);
      } else if (!v.note) {
        issue("note", "Say why, e.g. weekly count or spoiled");
      }

      if (ctx.issues.length) return z.NEVER;
      const { type, itemId, reference, supplier, note, date } = v;
      return { type, itemId, reference, supplier, note, date, quantity: amount!, unitCost };
    });
}

/** The live "= 30 pcs · ₱15.00 per pc" line for a Stock In, using the same rules as the server. */
export function previewStockIn(unit: UnitId, packSize: number | undefined, quantity: string, totalPaid: string) {
  const amount = stockAmount(quantity, unit, packSize);
  const total = parsePesos(totalPaid);
  return { amount, unitCost: amount && total ? costFromPurchase(total, amount, unit) : undefined };
}

/** Builds a Stock In for the "on hand now" part of Add item (validated like any other Stock In). */
export function openingStockIn(unit: UnitId, packSize: number | undefined, quantity: string, totalPaid: string) {
  return movementFormSchema(unit, packSize).safeParse({
    type: "stock-in", itemId: "new", quantity, totalPaid, reference: "", supplier: "", note: "", date: manilaDate(),
  });
}

/** Add item: describes the item only. Its cost comes from what you pay at Stock In. */
export const itemFormSchema = z
  .object({
    name: z.string().trim().min(1, { error: "Enter a name" }).max(60),
    category: z.enum(itemCategories, { error: "Pick a category" }),
    unit: z.enum(Object.keys(units) as [UnitId, ...UnitId[]], { error: "Pick how you measure it" }),
    // An unchecked checkbox is simply missing from the form data.
    homemade: z.literal("on").nullish().transform((v) => v === "on"),
    /** Reorder point in the big unit (kg, L, pcs); converted by the action. */
    minimum: z.string().trim().regex(/^\d{1,6}(\.\d{1,3})?$/, { error: "Enter a number, like 3" }).transform(Number),
    /** Optional: bought by the pack/bag, e.g. 10 (pcs) or 1 (kg). In the big unit; stored in the small one. */
    packSize: z.string().trim().optional(),
  })
  .transform(({ packSize, ...values }, ctx) => {
    // Homemade items are made in batches, never bought by the pack.
    if (!packSize || values.homemade) return { ...values, packSize: undefined };
    const size = parsePackSize(packSize, values.unit);
    if (size === null) {
      ctx.addIssue({ code: "custom", path: ["packSize"], message: values.unit === "pcs" ? "Enter whole pieces, like 10" : "Enter an amount, like 1" });
      return z.NEVER;
    }
    return { ...values, packSize: size };
  });
