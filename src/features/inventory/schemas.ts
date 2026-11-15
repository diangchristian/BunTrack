import { z } from "zod";

import { parsePesos } from "@/features/products/schemas";
import { isRealPastDate } from "@/lib/format";
import { itemCategories, units, type UnitId } from "./types";

const text = (max: number) => z.string().trim().max(max, { error: `Keep it under ${max} characters` });

/** Parses the Stock In / Adjustment / Waste form for an item measured in `unit`. */
export function movementFormSchema(unit: UnitId) {
  const { factor, label } = units[unit];
  return z
    .object({
      type: z.enum(["stock-in", "adjustment", "waste"]),
      itemId: z.string().min(1, { error: "Pick an item" }),
      quantity: z.string().trim(),
      unitCost: z.string(),
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
      const decimals = unit === "pcs" ? "" : "(\\.\\d{1,3})?";
      const amount = new RegExp(`^\\d{1,6}${decimals}$`).test(v.quantity) ? Math.round(Number(v.quantity) * factor) : null;

      if (amount === null) issue("quantity", unit === "pcs" ? "Enter whole pieces, like 50" : `Enter ${label}, like 2.5`);
      else if (amount === 0 && v.type !== "adjustment") issue("quantity", "Enter more than 0");

      const unitCost = v.type === "stock-in" ? parsePesos(v.unitCost) : undefined;
      if (v.type === "stock-in") {
        // No reference check: market and store buys usually have no invoice or receipt number.
        if (unitCost === null) issue("unitCost", "Enter the price paid per unit, like 33.50");
      } else if (!v.note) {
        issue("note", "Say why, e.g. weekly count or spoiled");
      }

      if (ctx.issues.length) return z.NEVER;
      return { ...v, quantity: amount!, unitCost: unitCost ?? undefined };
    });
}

export const itemFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Enter a name" }).max(60),
  category: z.enum(itemCategories, { error: "Pick a category" }),
  unit: z.enum(Object.keys(units) as [UnitId, ...UnitId[]], { error: "Pick a unit" }),
  unitCost: z.string().transform((v, ctx) => {
    const cost = parsePesos(v);
    if (cost === null) {
      ctx.addIssue({ code: "custom", message: "Enter the price per unit, like 120.00" });
      return z.NEVER;
    }
    return cost;
  }),
  // An unchecked checkbox is simply missing from the form data.
  homemade: z.literal("on").nullish().transform((v) => v === "on"),
  /** Reorder point in the big unit (kg, L, pcs); converted by the action. */
  minimum: z.string().trim().regex(/^\d{1,6}(\.\d{1,3})?$/, { error: "Enter a number, like 3" }).transform(Number),
});
