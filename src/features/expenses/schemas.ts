import { z } from "zod";

import { pesos } from "@/features/products/schemas";
import { isRealPastDate } from "@/lib/format";
import { expenseBusinesses, expenseCategories, type ExpenseBusiness } from "./types";

export const expenseFormSchema = z.object({
  category: z.enum(expenseCategories, { error: "Pick a category" }),
  business: z.enum(expenseBusinesses.map((b) => b.id) as [ExpenseBusiness, ...ExpenseBusiness[]], { error: "Pick which business paid" }),
  amount: pesos("an amount").refine((v) => v > 0, { error: "Enter an amount more than ₱0" }),
  date: z.string().refine(isRealPastDate, { error: "Pick a real date, not in the future" }),
  paidVia: z.enum(["cash", "gcash"], { error: "Pick Cash or GCash" }),
  description: z.string().trim().max(120, { error: "Keep it under 120 characters" }),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
