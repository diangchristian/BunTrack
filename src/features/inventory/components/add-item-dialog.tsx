"use client";

import { keepValuesOnSubmit } from "@/lib/forms";
import { useActionState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addInventoryItem, type InventoryFormState } from "../actions";
import { itemCategories, units } from "../types";
import { Field } from "./movement-dialog";

const categoryItems = itemCategories.map((c) => ({ value: c, label: c }));
const unitItems = Object.entries(units).map(([value, u]) => ({ value, label: u.label }));

export function AddItemDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <AddItemForm onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function AddItemForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, saving] = useActionState(async (prev: InventoryFormState, formData: FormData) => {
    const result = await addInventoryItem(prev, formData);
    if (result.ok) onDone();
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={keepValuesOnSubmit(formAction)} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">Add item</DialogTitle>
        <DialogDescription>It starts at 0 on hand. Record a Stock In when the first delivery arrives.</DialogDescription>
      </DialogHeader>

      <Field label="Name" htmlFor="item-name" error={errors.name?.[0]}>
        <Input id="item-name" name="name" maxLength={60} required placeholder="e.g. Pickles" className="h-10" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category" htmlFor="item-category" error={errors.category?.[0]}>
          <Select name="category" items={categoryItems} defaultValue="Pantry">
            <SelectTrigger id="item-category" className="h-10 w-full">
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
        <Field label="Measured in" htmlFor="item-unit" error={errors.unit?.[0]}>
          <Select name="unit" items={unitItems} defaultValue="pcs">
            <SelectTrigger id="item-unit" className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {unitItems.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Unit cost (₱ per pc / kg / L)" htmlFor="item-cost" error={errors.unitCost?.[0]}>
          <Input id="item-cost" name="unitCost" inputMode="decimal" required placeholder="120.00" className="h-10 tabular-nums" />
        </Field>
        <Field label="Reorder at (minimum)" htmlFor="item-min" error={errors.minimum?.[0]}>
          <Input id="item-min" name="minimum" inputMode="decimal" required placeholder="3" className="h-10 tabular-nums" />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="homemade" className="size-4 accent-primary" />
        Made in-house (e.g. patties): Stock In records a batch made, with the cost to make one
      </label>

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
          <Check data-icon="inline-start" /> {saving ? "Adding…" : "Add item"}
        </Button>
      </DialogFooter>
    </form>
  );
}
