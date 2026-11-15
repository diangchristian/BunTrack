"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productMargin } from "@/features/products/costing";
import { categoryLabel, type CostedProduct } from "@/features/products/types";
import { formatCentavos } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InventoryItem, RecipeLine } from "../types";
import { PricingPanel } from "./pricing-panel";
import { RecipeBreakdown } from "./recipe-breakdown";

/** Made items: ≥60% healthy, 55–60% watch, below 55% flagged. Resold Dan Eric margins are set by the dealer. */
function health(product: CostedProduct) {
  if (product.category === "iceCream") return { label: "Dealer-set", variant: "neutral" } as const;
  if (!product.hasRecipe) return { label: "No recipe", variant: "neutral" } as const;
  const { marginPercent } = productMargin(product.price, product.cost);
  if (marginPercent >= 60) return { label: "Healthy", variant: "success" } as const;
  if (marginPercent >= 55) return { label: "Watch", variant: "warning" } as const;
  return { label: "Low margin", variant: "danger" } as const;
}

export function CostingWorkbench({
  products,
  items,
  recipes,
  initialProductId,
}: {
  products: CostedProduct[];
  items: InventoryItem[];
  recipes: Record<string, RecipeLine[]>;
  initialProductId?: string;
}) {
  const [productId, setProductId] = useState(
    products.some((p) => p.id === initialProductId) ? initialProductId! : (products[0]?.id ?? ""),
  );
  const product = products.find((p) => p.id === productId);
  if (!product) return <p className="text-sm text-muted-foreground">Add a product first.</p>;
  const resold = product.category === "iceCream";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
            <div className="flex min-w-60 flex-1 flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground" id="product-label">
                Product
              </span>
              <Select items={products.map((p) => ({ value: p.id, label: p.name }))} value={productId} onValueChange={(v) => v && setProductId(v)}>
                <SelectTrigger aria-labelledby="product-label" size="lg" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2 pb-2">
              <Badge variant="brand">{categoryLabel(product.category)}</Badge>
              <Badge variant="success">Costs synced with Inventory</Badge>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
            <RecipeBreakdown key={product.id} productId={product.id} recipe={recipes[product.id] ?? []} items={items} resold={resold} pieces={product.pieces} />
          </section>
        </div>

        <PricingPanel key={product.id} productId={product.id} productName={product.name} cost={product.hasRecipe ? product.cost : null} price={product.price} resold={resold} pieces={product.pieces} />
      </div>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
        <div>
          <h2 className="text-[15px] font-semibold">Margin across the menu</h2>
          <p className="text-xs text-muted-foreground">
            Made items: food cost target 30–40% · margin below 55% is flagged. Dan Eric margins are set by the dealer.
          </p>
        </div>
        <div className="overflow-hidden rounded-[10px] border">
          <Table>
            <TableHeader className="bg-secondary">
              <TableRow>
                <TableHead className="text-xs">Product</TableHead>
                <TableHead className="text-right text-xs">Price</TableHead>
                <TableHead className="hidden text-right text-xs sm:table-cell">Cost</TableHead>
                <TableHead className="text-right text-xs">Gross profit</TableHead>
                <TableHead className="hidden text-right text-xs md:table-cell">Food cost %</TableHead>
                <TableHead className="text-right text-xs">Margin</TableHead>
                <TableHead className="hidden text-xs sm:table-cell">Health</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const m = productMargin(p.price, p.cost);
                const h = health(p);
                return (
                  <TableRow
                    key={p.id}
                    onClick={() => setProductId(p.id)}
                    className={cn("cursor-pointer", p.id === productId && "bg-brand-soft hover:bg-brand-soft")}
                    aria-selected={p.id === productId}
                  >
                    <TableCell className="font-semibold">{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCentavos(p.price)}</TableCell>
                    <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                      {p.hasRecipe ? formatCentavos(p.cost) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{p.hasRecipe ? formatCentavos(m.profit) : "—"}</TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">{p.hasRecipe ? `${m.foodCostPercent}%` : "—"}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{p.hasRecipe ? `${m.marginPercent}%` : "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={h.variant}>{h.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
