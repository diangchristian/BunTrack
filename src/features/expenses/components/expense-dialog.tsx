"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/features/inventory/components/movement-dialog";
import { keepValuesOnSubmit } from "@/lib/forms";
import { manilaDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { saveExpense, type ExpenseFormState } from "../actions";
import { expenseBusinesses, expenseCategories, type Expense } from "../types";

const categoryItems = expenseCategories.map((c) => ({ value: c, label: c }));
const businessItems = expenseBusinesses.map((b) => ({ value: b.id, label: b.label }));

/** expense = null → "Record Expense"; an expense → "Edit Expense". */
export function ExpenseDialog({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <ExpenseForm expense={expense} onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function ExpenseForm({ expense, onDone }: { expense: Expense | null; onDone: () => void }) {
  const [state, formAction, saving] = useActionState(async (prev: ExpenseFormState, formData: FormData) => {
    const result = await saveExpense(prev, formData);
    if (result.ok) onDone();
    return result;
  }, {});
  const [paidVia, setPaidVia] = useState(expense?.paidVia ?? "cash");
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={keepValuesOnSubmit(formAction)} className="flex flex-col gap-4">
      {expense && <input type="hidden" name="id" value={expense.id} />}
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">{expense ? "Edit Expense" : "Record Expense"}</DialogTitle>
        <DialogDescription>Operating costs only. Ingredients and Dan Eric stock go through Inventory → Stock In.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category" htmlFor="exp-category" error={errors.category?.[0]}>
          <Select name="category" items={categoryItems} defaultValue={expense?.category ?? "Electricity"}>
            <SelectTrigger id="exp-category" size="lg" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryItems.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Amount (₱)" htmlFor="exp-amount" error={errors.amount?.[0]}>
          <Input
            id="exp-amount"
            name="amount"
            inputMode="decimal"
            defaultValue={expense ? (expense.amount / 100).toFixed(2) : ""}
            placeholder="500.00"
            required
            aria-invalid={!!errors.amount}
            className="h-10 tabular-nums"
          />
        </Field>
        <Field label="For" htmlFor="exp-business" error={errors.business?.[0]}>
          <Select name="business" items={businessItems} defaultValue={expense?.business ?? "burger"}>
            <SelectTrigger id="exp-business" size="lg" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {businessItems.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Date paid" htmlFor="exp-date" error={errors.date?.[0]}>
          <Input id="exp-date" name="date" type="date" defaultValue={expense?.date ?? manilaDate()} max={manilaDate()} required className="h-10" />
        </Field>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-muted-foreground" id="paid-via-label">
          Paid via
        </span>
        <input type="hidden" name="paidVia" value={paidVia} />
        <div className="grid grid-cols-2 gap-1 rounded-[10px] border bg-secondary p-1" role="group" aria-labelledby="paid-via-label">
          {(["cash", "gcash"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={paidVia === m}
              onClick={() => setPaidVia(m)}
              className={cn("h-8 rounded-md text-sm font-medium text-muted-foreground", paidVia === m && "bg-background font-semibold text-foreground shadow-sm")}
            >
              {m === "cash" ? "Cash" : "GCash"}
            </button>
          ))}
        </div>
      </div>

      <Field label="Description" htmlFor="exp-description" error={errors.description?.[0]}>
        <Input id="exp-description" name="description" defaultValue={expense?.description} maxLength={120} placeholder="e.g. Electricity bill, Oct 15 – Nov 14" className="h-10" />
      </Field>
      <p className="-mt-2 text-xs text-muted-foreground">
        &ldquo;Shared&rdquo; is for one bill covering both businesses. It&apos;s counted under All, not in either business&apos;s report.
      </p>

      {state.error && (
        <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <DialogFooter className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-10" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" className="h-10 font-semibold" disabled={saving}>
          <Check data-icon="inline-start" /> {saving ? "Saving…" : "Save Expense"}
        </Button>
      </DialogFooter>
    </form>
  );
}
