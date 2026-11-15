"use client";

import { keepValuesOnSubmit } from "@/lib/forms";
import { useActionState, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCentavos, manilaDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { parsePesos } from "@/features/products/schemas";
import { recordStockMovement, type InventoryFormState } from "../actions";
import { formatQuantity, stockStatus, stockValue } from "../costing";
import { units, type InventoryItem, type MovementType } from "../types";

type FormType = Exclude<MovementType, "sale">;
const types: { id: FormType; label: string }[] = [
  { id: "stock-in", label: "Stock In" },
  { id: "adjustment", label: "Adjustment" },
  { id: "waste", label: "Waste / Expired" },
];
const statusLabel = { in: "In Stock", low: "Low Stock", out: "Out of Stock" };

export function MovementDialog({
  open,
  initial,
  items,
  usedBy,
  lastPlace,
  onClose,
}: {
  open: boolean;
  initial: { itemId?: string; type: FormType };
  items: InventoryItem[];
  usedBy: Record<string, string[]>;
  /** itemId → where it was last bought, from movement history. */
  lastPlace: Record<string, string>;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {/* Mounted only while open, so each movement starts fresh. */}
        <MovementForm initial={initial} items={items} usedBy={usedBy} lastPlace={lastPlace} onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function MovementForm({
  initial,
  items,
  usedBy,
  lastPlace,
  onDone,
}: {
  initial: { itemId?: string; type: FormType };
  items: InventoryItem[];
  usedBy: Record<string, string[]>;
  lastPlace: Record<string, string>;
  onDone: () => void;
}) {
  const [state, formAction, saving] = useActionState(async (prev: InventoryFormState, formData: FormData) => {
    const result = await recordStockMovement(prev, formData);
    if (result.ok) onDone();
    return result;
  }, {});
  const [type, setType] = useState<FormType>(initial.type);
  const [itemId, setItemId] = useState(initial.itemId ?? "");
  const item = items.find((i) => i.id === itemId);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState(item ? (item.unitCost / 100).toFixed(2) : "");
  const errors = state.fieldErrors ?? {};
  const batch = type === "stock-in" && item?.homemade; // made in the shop, not bought

  // Live preview of what saving will do. The server re-validates everything.
  const amount = item && /^\d+(\.\d+)?$/.test(quantity.trim()) ? Math.round(Number(quantity) * units[item.unit].factor) : null;
  const after = item && amount !== null ? (type === "stock-in" ? item.quantity + amount : type === "adjustment" ? amount : item.quantity - amount) : null;
  const newCost = parsePesos(unitCost);
  const costChanges = type === "stock-in" && item && newCost !== null && newCost !== item.unitCost;

  return (
    <form onSubmit={keepValuesOnSubmit(formAction)} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">
          {types.find((t) => t.id === type)!.label}
          {item && ` · ${item.name}`}
        </DialogTitle>
        <DialogDescription>
          {batch && "Record a batch made in the shop. "}
          {item
            ? `Current stock: ${formatQuantity(item.quantity, item.unit)} · Min. ${formatQuantity(item.minimum, item.unit)}`
            : "Pick the item this is for."}
        </DialogDescription>
      </DialogHeader>

      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-3 gap-1 rounded-[10px] border bg-secondary p-1" role="group" aria-label="Movement type">
        {types.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={type === t.id}
            onClick={() => setType(t.id)}
            className={cn("h-8 rounded-md text-xs font-medium text-muted-foreground sm:text-sm", type === t.id && "bg-background font-semibold text-foreground shadow-sm")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Field label="Item" htmlFor="itemId" error={errors.itemId?.[0]}>
        <Select
          name="itemId"
          items={items.map((i) => ({ value: i.id, label: i.name }))}
          value={itemId}
          onValueChange={(v) => {
            if (!v) return;
            setItemId(v);
            const next = items.find((i) => i.id === v);
            if (next) setUnitCost((next.unitCost / 100).toFixed(2));
          }}
        >
          <SelectTrigger id="itemId" size="lg" className="w-full">
            <SelectValue placeholder="Choose an item" />
          </SelectTrigger>
          <SelectContent>
            {items.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {type === "stock-in" && !batch && (
        <Field label="Bought from" htmlFor="supplier" error={errors.supplier?.[0]}>
          <Input
            id="supplier"
            name="supplier"
            key={item?.id}
            // Each item is usually bought from the same place, so start with the last one.
            defaultValue={(item && lastPlace[item.id]) ?? (item?.category === "Ice Cream (Dan Eric)" ? "Dan Eric" : "")}
            placeholder="e.g. Palengke, Shopee, Made in-house"
            list="places"
            className="h-10"
          />
          <datalist id="places">
            {[...new Set([...Object.values(lastPlace), "Palengke", "Made in-house", "Shopee", "Lazada", "Dan Eric"])].map((place) => (
              <option key={place} value={place} />
            ))}
          </datalist>
        </Field>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={`${batch ? "Quantity made" : type === "stock-in" ? "Quantity received" : type === "adjustment" ? "Counted on hand" : "Quantity wasted"}${item ? ` (${units[item.unit].label})` : ""}`}
          htmlFor="quantity"
          error={errors.quantity?.[0]}
        >
          <Input id="quantity" name="quantity" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder={item?.unit === "pcs" ? "50" : "2.5"} required className="h-10 tabular-nums" />
        </Field>
        {type === "stock-in" ? (
          <Field
            label={`${batch ? "Cost to make" : "Unit cost"} (₱${item ? ` / ${units[item.unit].label === "pcs" ? "pc" : units[item.unit].label}` : ""})`}
            htmlFor="unitCost"
            error={errors.unitCost?.[0]}
          >
            <Input id="unitCost" name="unitCost" inputMode="decimal" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} required className="h-10 tabular-nums" />
          </Field>
        ) : (
          <input type="hidden" name="unitCost" value="" />
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {batch ? null : type === "stock-in" ? (
          <Field label="Receipt no. (optional)" htmlFor="reference" error={errors.reference?.[0]}>
            <Input id="reference" name="reference" placeholder="Leave blank for market buys" maxLength={40} className="h-10" />
          </Field>
        ) : (
          <Field label="Reason" htmlFor="note" error={errors.note?.[0]}>
            <Input id="note" name="note" placeholder={type === "waste" ? "e.g. Expired, spoiled" : "e.g. Weekly count"} maxLength={120} aria-invalid={!!errors.note} className="h-10" />
          </Field>
        )}
        <Field label={batch ? "Date made" : type === "stock-in" ? "Date received" : "Date"} htmlFor="date" error={errors.date?.[0]}>
          <Input id="date" name="date" type="date" defaultValue={manilaDate()} max={manilaDate()} required className="h-10" />
        </Field>
      </div>

      {item && after !== null && (
        <div className={cn("flex flex-col gap-2 rounded-[14px] p-4 text-sm", after < 0 ? "bg-destructive-soft" : "bg-success-soft")} aria-live="polite">
          <Row label="New stock level" value={after < 0 ? "More than you have" : `${formatQuantity(item.quantity, item.unit)} → ${formatQuantity(after, item.unit)}`} />
          {after >= 0 && <Row label="Status after save" value={statusLabel[stockStatus({ quantity: after, minimum: item.minimum })]} />}
          {type === "stock-in" && newCost !== null && amount !== null && (
            <Row label="Purchase total" value={formatCentavos(Math.round(stockValue({ quantity: amount, unitCost: newCost, unit: item.unit })))} />
          )}
        </div>
      )}

      {costChanges && (
        <p className="flex gap-2 rounded-[10px] bg-warning-soft p-3 text-xs text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Unit cost changes {formatCentavos(item.unitCost)} → {formatCentavos(newCost)}.{" "}
            {usedBy[item.id]?.length
              ? `${usedBy[item.id].length} product${usedBy[item.id].length === 1 ? "" : "s"} using ${item.name} will be re-costed right away.`
              : "No products use this item yet."}
          </span>
        </p>
      )}

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
          <Check data-icon="inline-start" /> {saving ? "Saving…" : `Confirm ${types.find((t) => t.id === type)!.label.split(" /")[0]}`}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </p>
  );
}
