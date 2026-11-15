"use client";

import { useActionState, useState } from "react";
import { Check, Droplet, Hash, Scale, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCentavos } from "@/lib/format";
import { keepValuesOnSubmit } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { addInventoryItem, type InventoryFormState } from "../actions";
import { formatQuantity, perUnitLabel } from "../costing";
import { parsePackSize, previewStockIn } from "../schemas";
import { itemCategories, units, type UnitId } from "../types";
import { Field } from "./movement-dialog";

const categoryItems = itemCategories.map((c) => ({ value: c, label: c }));
const measures: { unit: UnitId; label: string; hint: string; icon: LucideIcon }[] = [
  { unit: "pcs", label: "Counted", hint: "pieces · hotdogs, buns, cups", icon: Hash },
  { unit: "kg", label: "Weighed", hint: "kg · fries, onions, ground meat", icon: Scale },
  { unit: "L", label: "Liquid", hint: "liters · oil, sauce, syrup", icon: Droplet },
];

export function AddItemDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
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
  const [unit, setUnit] = useState<UnitId>("pcs");
  const [homemade, setHomemade] = useState(false);
  const [byPack, setByPack] = useState(false);
  const [packName, setPackName] = useState("pack");
  const [packSize, setPackSize] = useState("");
  const [openingQuantity, setOpeningQuantity] = useState("");
  const [openingTotal, setOpeningTotal] = useState("");
  const errors = state.fieldErrors ?? {};

  const unitLabel = units[unit].label;
  const perUnit = perUnitLabel(unit);
  const usesPack = byPack && !homemade;
  const packSizeSmall = usesPack ? (parsePackSize(packSize, unit) ?? undefined) : undefined;
  const packWord = packName.trim() || "pack";
  // Live "= 30 pcs · ₱15.00 per pc" using the same rules the server checks with.
  const opening = previewStockIn(unit, packSizeSmall, openingQuantity, openingTotal);

  return (
    <form onSubmit={keepValuesOnSubmit(formAction)} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">Add item</DialogTitle>
        <DialogDescription>Something you buy or make and use in your recipes. Its cost comes from what you pay at Stock In.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="item-name" error={errors.name?.[0]}>
          <Input id="item-name" name="name" maxLength={60} required placeholder="e.g. Hotdog" className="h-10" />
        </Field>
        <Field label="Category" htmlFor="item-category" error={errors.category?.[0]}>
          <Select name="category" items={categoryItems} defaultValue="Meat">
            <SelectTrigger id="item-category" size="lg" className="w-full">
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
      </div>

      <div className="flex flex-col gap-1.5">
        <span id="measure-label" className="text-xs font-semibold text-muted-foreground">
          How do you measure it?
        </span>
        <input type="hidden" name="unit" value={unit} />
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="measure-label">
          {measures.map((m) => (
            <button
              key={m.unit}
              type="button"
              role="radio"
              aria-checked={unit === m.unit}
              onClick={() => setUnit(m.unit)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-[10px] border border-input p-3 text-left",
                unit === m.unit && "border-2 border-primary bg-brand-soft",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <m.icon className="size-4" aria-hidden /> {m.label}
              </span>
              <span className="text-xs text-muted-foreground">{m.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="homemade" checked={homemade} onChange={(e) => setHomemade(e.target.checked)} className="size-4 accent-primary" />
        Made in-house (e.g. patties): Stock In records a batch you made
      </label>

      {!homemade && (
        <div className="flex flex-col gap-2 rounded-[10px] border p-3">
          <span className="text-xs font-semibold text-muted-foreground" id="bought-as-label">
            How do you buy it?
          </span>
          <div className="grid grid-cols-2 gap-1 rounded-[10px] border bg-secondary p-1" role="group" aria-labelledby="bought-as-label">
            {[
              { id: false, label: `Loose (by the ${perUnit})` },
              { id: true, label: "In packs / bags" },
            ].map((o) => (
              <button
                key={String(o.id)}
                type="button"
                aria-pressed={byPack === o.id}
                onClick={() => setByPack(o.id)}
                className={cn("h-8 rounded-md text-sm font-medium text-muted-foreground", byPack === o.id && "bg-background font-semibold text-foreground shadow-sm")}
              >
                {o.label}
              </button>
            ))}
          </div>
          {byPack && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Called a" htmlFor="pack-name">
                <Input id="pack-name" name="packName" list="pack-names" value={packName} onChange={(e) => setPackName(e.target.value)} maxLength={15} className="h-10" />
                <datalist id="pack-names">
                  {["pack", "bag", "box", "bottle", "tray"].map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </Field>
              <Field label={`Each ${packWord} holds (${unitLabel})`} htmlFor="pack-size" error={errors.packSize?.[0]}>
                <Input
                  id="pack-size"
                  name="packSize"
                  inputMode="decimal"
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                  placeholder={unit === "pcs" ? "10" : "1"}
                  required
                  className="h-10 tabular-nums"
                />
              </Field>
            </div>
          )}
        </div>
      )}

      <Field label={`Remind me to buy more below (${unitLabel})`} htmlFor="item-min" error={errors.minimum?.[0]}>
        <Input id="item-min" name="minimum" inputMode="decimal" required placeholder={unit === "pcs" ? "10" : "2"} className="h-10 tabular-nums" />
      </Field>

      <div className="flex flex-col gap-3 rounded-[10px] border border-dashed p-3">
        <div>
          <p className="text-sm font-semibold">On hand now (optional)</p>
          <p className="text-xs text-muted-foreground">If you already have some, enter it here and skip a separate Stock In.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={homemade ? `How many made (${unitLabel})` : usesPack ? `How many? (1 ${packWord} = ${packSize || "…"} ${unitLabel})` : `How much (${unitLabel})`}
            htmlFor="opening-quantity"
            error={errors.openingQuantity?.[0]}
          >
            <Input
              id="opening-quantity"
              name="openingQuantity"
              inputMode="decimal"
              value={openingQuantity}
              onChange={(e) => setOpeningQuantity(e.target.value)}
              placeholder={usesPack ? "3" : unit === "pcs" ? "30" : "2.5"}
              className="h-10 tabular-nums"
            />
          </Field>
          <Field label={homemade ? "Total cost to make (₱)" : "Total paid (₱)"} htmlFor="opening-total" error={errors.openingTotal?.[0]}>
            <Input
              id="opening-total"
              name="openingTotal"
              inputMode="decimal"
              value={openingTotal}
              onChange={(e) => setOpeningTotal(e.target.value)}
              placeholder="450.00"
              required={!!openingQuantity}
              className="h-10 tabular-nums"
            />
          </Field>
        </div>
        {opening.amount !== null && opening.amount > 0 && (
          <p className="rounded-md bg-success-soft px-3 py-2 text-sm text-success-strong" aria-live="polite">
            = {formatQuantity(opening.amount, unit)} on hand
            {opening.unitCost !== undefined && ` · ${formatCentavos(opening.unitCost)} per ${perUnit}`}
          </p>
        )}
      </div>

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
