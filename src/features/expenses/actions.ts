"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { formText } from "@/lib/forms";
import { logActivity } from "@/features/activity/log";
import { canUseStore, getCurrentUser } from "@/features/auth/queries";
import { toDbDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatCentavos } from "@/lib/format";
import { expenseFormSchema } from "./schemas";

export type ExpenseFormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> };

/** Records an expense, or edits one when the form includes an id. */
export async function saveExpense(_prev: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  if (!(await canUseStore())) return { error: "You don't have permission to record expenses." };

  const parsed = expenseFormSchema.safeParse(
    Object.fromEntries(["category", "business", "amount", "date", "paidVia", "description"].map((k) => [k, formText(formData, k)])),
  );
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const data = { ...parsed.data, date: toDbDate(parsed.data.date) };
  const id = formText(formData, "id");
  if (id) {
    // Edits keep whoever recorded it first.
    const { count } = await db.expense.updateMany({ where: { id }, data });
    if (count === 0) {
      refresh(); // someone else deleted it; drop the stale row
      return { error: "This expense no longer exists." };
    }
  } else {
    await db.expense.create({ data: { ...data, recordedById: (await getCurrentUser()).id } });
  }
  await logActivity({
    module: "Expenses",
    action: id ? "Expense edited" : "Expense added",
    record: parsed.data.description || parsed.data.category,
    change: formatCentavos(parsed.data.amount),
  });
  refresh();
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ExpenseFormState> {
  if (!(await canUseStore())) return { error: "You don't have permission to delete expenses." };
  // deleteMany doesn't throw when another device deleted it first.
  const expense = await db.expense.findUnique({ where: { id }, select: { description: true, category: true, amount: true } });
  const { count } = await db.expense.deleteMany({ where: { id } });
  if (!expense || count === 0) {
    refresh(); // already deleted elsewhere; drop the stale row
    return { error: "This expense no longer exists." };
  }
  await logActivity({ module: "Expenses", action: "Expense deleted", record: expense.description || expense.category, change: formatCentavos(expense.amount) });
  refresh();
  return { ok: true };
}
