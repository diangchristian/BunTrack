"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { canManageStore, getCurrentUser } from "@/features/auth/queries";
import { expenseFormSchema } from "./schemas";
import { expenseStore } from "./store";

export type ExpenseFormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> };

const field = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

/** Records an expense, or edits one when the form includes an id. */
export async function saveExpense(_prev: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  if (!(await canManageStore())) return { error: "You don't have permission to record expenses." };

  const parsed = expenseFormSchema.safeParse(
    Object.fromEntries(["category", "business", "amount", "date", "paidVia", "description"].map((k) => [k, field(formData, k)])),
  );
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const id = field(formData, "id");
  if (id) {
    if (!expenseStore.update(id, parsed.data)) {
      refresh(); // someone else deleted it; drop the stale row
      return { error: "This expense no longer exists." };
    }
  } else {
    expenseStore.add(parsed.data, (await getCurrentUser()).name);
  }
  refresh();
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ExpenseFormState> {
  if (!(await canManageStore())) return { error: "You don't have permission to delete expenses." };
  if (!expenseStore.remove(id)) {
    refresh(); // already deleted elsewhere; drop the stale row
    return { error: "This expense no longer exists." };
  }
  refresh();
  return { ok: true };
}
