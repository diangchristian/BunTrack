"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Archive, Calculator, Check, ImagePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/features/inventory/components/movement-dialog";
import { formatCentavos } from "@/lib/format";
import { keepValuesOnSubmit } from "@/lib/forms";
import { archiveProduct, saveProduct, type ProductFormState } from "../actions";
import { productMargin } from "../costing";
import { parsePesos } from "../schemas";
import { ICE_CREAM, type Category } from "@/features/categories/types";
import type { CategoryId, CostedProduct } from "../types";
import { ProductImage } from "./product-image";

const centavosToInput = (c: number) => (c / 100).toFixed(2);

/**
 * Shrinks a photo in the browser to fit 512 × 512 and re-encodes it (WebP, or JPEG where
 * WebP encoding isn't supported), so the upload stays small. The server re-checks it.
 */
async function resizePhoto(file: File, max = 512) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const webp = canvas.toDataURL("image/webp", 0.85);
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** product = null → "Add Product"; a product → "Edit Product". */
export function ProductDialog({ product, categories, onClose }: { product: CostedProduct | null; categories: Category[]; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <ProductForm product={product} categories={categories} onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function ProductForm({ product, categories, onDone }: { product: CostedProduct | null; categories: Category[]; onDone: () => void }) {
  const categoryItems = categories.map((c) => ({ value: c.id, label: c.label }));
  const [archiveError, setArchiveError] = useState<string>();
  const [state, formAction, saving] = useActionState(async (prev: ProductFormState, formData: FormData) => {
    setArchiveError(undefined); // only the latest attempt's error is shown
    const result = await saveProduct(prev, formData);
    if (result.ok) onDone();
    return result;
  }, {});
  const [price, setPrice] = useState(product ? centavosToInput(product.price) : "");
  const [category, setCategory] = useState<CategoryId>(product?.category ?? categories[0]?.id ?? "");
  const [photo, setPhoto] = useState(product?.image ?? "");
  const [photoError, setPhotoError] = useState<string>();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, startArchive] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const resold = category === ICE_CREAM; // Dan Eric ice cream: bought ready-made
  const priceC = parsePesos(price);
  // Cost comes from the recipe and Inventory unit costs, so it's read-only here.
  const costC = product?.hasRecipe ? product.cost : null;
  const margin = priceC && costC !== null ? productMargin(priceC, costC) : null;
  const errors = state.fieldErrors ?? {};
  const busy = saving || archiving;

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError(undefined);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setPhotoError("Use a PNG, JPG or WebP photo.");
    if (file.size > 10_000_000) return setPhotoError("That photo is over 10 MB. Try a smaller one.");
    try {
      setPhoto(await resizePhoto(file));
    } catch {
      setPhotoError("Couldn't read that photo. Try another one.");
    }
  }

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
    <form onSubmit={keepValuesOnSubmit(formAction)} className="flex flex-col gap-5">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="image" value={photo} />

      <DialogHeader>
        <DialogTitle className="text-lg font-bold">{product ? "Edit Product" : "Add Product"}</DialogTitle>
        <DialogDescription>{product ? product.name : "New items show on the POS as soon as you save."}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 sm:grid-cols-[136px_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-2">
          <ProductImage
            product={{ name: product?.name ?? "New product", category, image: photo || undefined, available: true }}
            sizes="136px"
            className="size-34 border"
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Product photo"
            onChange={(e) => {
              void pickPhoto(e.target.files?.[0]);
              e.target.value = ""; // allow picking the same file again
            }}
          />
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => fileInput.current?.click()}>
            <ImagePlus data-icon="inline-start" /> {photo ? "Change photo" : "Upload photo"}
          </Button>
          {photo && (
            <Button type="button" variant="ghost" size="sm" className="w-full text-destructive" onClick={() => setPhoto("")}>
              <Trash2 data-icon="inline-start" /> Remove
            </Button>
          )}
          <p className="text-center text-xs text-muted-foreground">PNG, JPG or WebP</p>
          {(photoError || errors.image) && <p className="text-center text-xs text-destructive">{photoError ?? errors.image?.[0]}</p>}
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Product name" htmlFor="name" error={errors.name?.[0]}>
            <Input
              id="name"
              name="name"
              defaultValue={product?.name}
              maxLength={60}
              required
              placeholder="e.g. Classic Cheeseburger"
              aria-invalid={!!errors.name}
              className="h-10"
            />
          </Field>
          <Field label="Description" htmlFor="description" error={errors.description?.[0]}>
            <Input id="description" name="description" defaultValue={product?.description} maxLength={120} placeholder="e.g. Beef patty, cheese, lettuce" className="h-10" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="category" error={errors.category?.[0]}>
              <Select name="category" items={categoryItems} value={category} onValueChange={(v) => v && setCategory(v as CategoryId)}>
                <SelectTrigger id="category" size="lg" className="w-full">
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
              <Input
                id="price"
                name="price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="149.00"
                required
                aria-invalid={!!errors.price}
                className="h-10 tabular-nums"
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-[10px] bg-brand-soft p-3">
          <Switch name="b1t1" value="on" defaultChecked={product?.pieces === 2} className="mt-0.5" />
          <span>
            <span className="block text-sm font-semibold text-brand-strong">Buy 1 Take 1</span>
            <span className="block text-xs text-muted-foreground">Each order gives 2 pieces. Enter the recipe per piece.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-[10px] bg-success-soft p-3">
          <Switch name="available" value="on" defaultChecked={product?.available ?? true} className="mt-0.5" />
          <span>
            <span className="block text-sm font-semibold text-success-strong">Available on POS</span>
            <span className="block text-xs text-muted-foreground">
              {product?.servingsLeft === 0
                ? `Out of ${product.limitedBy} right now.`
                : product?.servingsLeft != null
                  ? `Stock can make ${product.servingsLeft} more.`
                  : "Turn off to hide it from sale."}
            </span>
          </span>
        </label>
      </div>

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
        <Row label="Gross margin · Food cost" value={margin ? `${margin.marginPercent}% · ${margin.foodCostPercent}%` : "—"} strong={!!margin && margin.profit >= 0} />
        {margin && margin.profit < 0 && <p className="text-xs font-semibold text-destructive">This price is below the production cost.</p>}
      </section>

      {(archiveError || state.error) && (
        <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {archiveError ?? state.error}
        </p>
      )}

      <DialogFooter className="flex-row items-center gap-2 sm:justify-between">
        {product ? (
          <Button type="button" variant="destructive" onClick={archive} disabled={busy}>
            <Archive data-icon="inline-start" /> {confirmArchive ? "Confirm archive" : "Archive"}
          </Button>
        ) : (
          <span />
        )}
        <span className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            <Check data-icon="inline-start" /> {saving ? "Saving…" : "Save Product"}
          </Button>
        </span>
      </DialogFooter>
    </form>
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
