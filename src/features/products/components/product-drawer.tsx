"use client";

import { keepValuesOnSubmit } from "@/lib/forms";
import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Archive, Calculator, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { formatCentavos } from "@/lib/format";
import { archiveProduct, saveProduct, type ProductFormState } from "../actions";
import { productMargin } from "../costing";
import { parsePesos } from "../schemas";
import { categories, type CostedProduct } from "../types";
import { ProductImage } from "./product-image";

const categoryItems = categories.map((c) => ({ value: c.id, label: c.label }));

/** product = null → "Add Product"; a product → "Edit Product". */
export function ProductDrawer({
  open,
  product,
  onClose,
}: {
  open: boolean;
  product: CostedProduct | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        {/* Mounted only while open, so every edit starts from the saved values. */}
        <ProductForm key={product?.id ?? "new"} product={product} onDone={onClose} />
      </SheetContent>
    </Sheet>
  );
}

const centavosToInput = (c: number) => (c / 100).toFixed(2);

function ProductForm({ product, onDone }: { product: CostedProduct | null; onDone: () => void }) {
  const [archiveError, setArchiveError] = useState<string>();
  const [state, formAction, saving] = useActionState(async (prev: ProductFormState, formData: FormData) => {
    setArchiveError(undefined); // only the latest attempt's error is shown
    const result = await saveProduct(prev, formData);
    if (result.ok) onDone();
    return result;
  }, {});
  const [price, setPrice] = useState(product ? centavosToInput(product.price) : "");
  const [category, setCategory] = useState<string>(product?.category ?? "burgers");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, startArchive] = useTransition();

  const resold = category === "iceCream"; // Dan Eric ice cream: bought ready-made
  const priceC = parsePesos(price);
  // Cost comes from the recipe and Inventory unit costs, so it's read-only here.
  const costC = product?.hasRecipe ? product.cost : null;
  const margin = priceC && costC !== null ? productMargin(priceC, costC) : null;
  const errors = state.fieldErrors ?? {};
  const busy = saving || archiving;

  function archive() {
    if (!product) return;
    if (!confirmArchive) return setConfirmArchive(true);
    setArchiveError(undefined);
    startArchive(async () => {
      const result = await archiveProduct(product.id);
      if (result.ok) onDone();
      else setArchiveError(result.error);
    });
  }

  return (
    <form onSubmit={keepValuesOnSubmit(formAction)} className="flex min-h-0 flex-1 flex-col">
      {product && <input type="hidden" name="id" value={product.id} />}

      <SheetHeader className="border-b px-6 py-5">
        <SheetTitle className="text-lg font-bold">{product ? "Edit Product" : "Add Product"}</SheetTitle>
        <SheetDescription>{product ? product.name : "New items show on the POS as soon as you save."}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        <section className="flex flex-col gap-4">
          <h3 className="text-[15px] font-semibold">Basic information</h3>
          <div className="flex gap-4">
            <ProductImage
              product={{ name: product?.name ?? "New product", category: category as CostedProduct["category"], image: product?.image, available: true }}
              sizes="96px"
              className="hidden size-24 sm:flex"
            />
            <div className="flex flex-1 flex-col gap-3">
              <Field label="Product name" htmlFor="name" error={errors.name?.[0]}>
                <Input id="name" name="name" defaultValue={product?.name} maxLength={60} required aria-invalid={!!errors.name} className="h-10" />
              </Field>
              <Field label="Description" htmlFor="description" error={errors.description?.[0]}>
                <Input id="description" name="description" defaultValue={product?.description} maxLength={120} placeholder="e.g. Beef patty, cheese, lettuce" className="h-10" />
              </Field>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category" htmlFor="category" error={errors.category?.[0]}>
              <Select name="category" items={categoryItems} value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger id="category" className="h-10 w-full">
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
            <Field label="Selling price (₱)" htmlFor="price" error={errors.price?.[0]}>
              <Input id="price" name="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="149.00" required aria-invalid={!!errors.price} className="h-10 tabular-nums" />
            </Field>
          </div>
        </section>

        <label className="flex items-center gap-3 rounded-[10px] bg-brand-soft p-3">
          <Switch name="b1t1" value="on" defaultChecked={product?.pieces === 2} />
          <span>
            <span className="block text-sm font-semibold text-brand-strong">Buy 1 Take 1</span>
            <span className="block text-xs text-muted-foreground">
              Each order gives 2 pieces. Enter the recipe per piece; cost and stock count both pieces.
            </span>
          </span>
        </label>

        <label className="flex items-center gap-3 rounded-[10px] bg-success-soft p-3">
          <Switch name="available" value="on" defaultChecked={product?.available ?? true} />
          <span>
            <span className="block text-sm font-semibold text-success-strong">Available on POS</span>
            <span className="block text-xs text-muted-foreground">
              Turn off to hide it from sale without deleting it.
              {product?.servingsLeft != null &&
                (product.servingsLeft === 0
                  ? ` It's out of ${product.limitedBy} right now, so the POS shows it as unavailable.`
                  : ` Stock can make ${product.servingsLeft} more (${product.limitedBy} runs out first).`)}
            </span>
          </span>
        </label>

        <section className="flex flex-col gap-2 rounded-[14px] border bg-secondary p-4 text-sm" aria-live="polite">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold">Cost summary</h3>
            {product && (
              <Link href={`/costing?product=${product.id}`} className="flex items-center gap-1 text-xs font-semibold text-brand-strong hover:underline">
                <Calculator className="size-3.5" aria-hidden /> {product.hasRecipe ? "Edit recipe" : "Add recipe"}
              </Link>
            )}
          </div>
          {!product?.hasRecipe && (
            <p className="text-xs text-muted-foreground">
              {product ? "No recipe yet. Add one in Costing & Pricing to see the cost." : "Save first, then add the recipe in Costing & Pricing."}
            </p>
          )}
          <Row label={resold ? "Dealer price / unit" : product?.pieces === 2 ? "Production cost / order (2 pcs)" : "Production cost / serving"} value={costC !== null ? formatCentavos(costC) : "—"} />
          <Row label="Selling price" value={priceC ? formatCentavos(priceC) : "—"} />
          <Row label="Gross profit" value={margin ? formatCentavos(margin.profit) : "—"} strong={!!margin && margin.profit >= 0} />
          <Row
            label="Gross margin · Food cost"
            value={margin ? `${margin.marginPercent}% · ${margin.foodCostPercent}%` : "—"}
            strong={!!margin && margin.profit >= 0}
          />
          {margin && margin.profit < 0 && (
            <p className="text-xs font-semibold text-destructive">This price is below the production cost.</p>
          )}
        </section>

        {(archiveError || state.error) && (
          <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
            {archiveError ?? state.error}
          </p>
        )}
      </div>

      <SheetFooter className="flex-row items-center gap-2 border-t px-6 py-4">
        {product && (
          <Button type="button" variant="destructive" onClick={archive} disabled={busy}>
            <Archive data-icon="inline-start" /> {confirmArchive ? "Confirm archive" : "Archive"}
          </Button>
        )}
        <span className="flex-1" />
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          <Check data-icon="inline-start" /> {saving ? "Saving…" : "Save Product"}
        </Button>
      </SheetFooter>
    </form>
  );
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
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

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <p className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold text-success-strong" : "font-semibold"}>{value}</span>
    </p>
  );
}
