"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { formatCentavos } from "@/lib/format";
import { cn } from "@/lib/utils";
import { categories, type CategoryId, type MenuProduct } from "../types";
import { ProductImage } from "@/features/products/components/product-image";

export function ProductGrid({
  menu,
  quantities,
  onAdd,
}: {
  menu: MenuProduct[];
  quantities: Map<string, number>;
  onAdd: (productId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId | "all">("all");

  const search = query.trim().toLowerCase();
  const visible = menu.filter(
    (p) => (category === "all" || p.category === category) && p.name.toLowerCase().includes(search),
  );
  const chips = [
    { id: "all" as const, label: "All", count: menu.length },
    ...categories.map((c) => ({ ...c, count: menu.filter((p) => p.category === c.id).length })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search menu…"
          aria-label="Search menu"
          className="h-10 pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {chips.map((chip) => {
          const active = chip.id === category;
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(chip.id)}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {chip.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  active ? "bg-brand-strong text-primary-foreground" : "bg-neutral-soft",
                )}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No menu items match “{query}”.</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {visible.map((product) => {
            const inCart = quantities.get(product.id) ?? 0;
            return (
              <li key={product.id}>
                <button
                  type="button"
                  disabled={!product.available || inCart >= (product.servingsLeft ?? 99)}
                  onClick={() => onAdd(product.id)}
                  aria-label={`Add ${product.name}, ${formatCentavos(product.price)}${inCart ? `, ${inCart} in order` : ""}`}
                  className={cn(
                    "relative flex h-full w-full flex-col gap-2.5 rounded-[14px] border bg-card p-3 text-left transition-shadow",
                    "hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:hover:shadow-none",
                    inCart > 0 && "border-primary ring-1 ring-primary",
                  )}
                >
                  {inCart > 0 && (
                    <span className="absolute top-2 right-2 z-10 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {inCart}
                    </span>
                  )}
                  <ProductImage product={product} sizes="200px" className={cn("h-24 w-full", !product.available && "opacity-60")} />
                  <span className={cn("text-sm font-semibold", !product.available && "opacity-60")}>
                    {product.name}
                    {product.available && product.servingsLeft !== null && (
                      <span className="block text-xs font-normal text-muted-foreground">{product.servingsLeft} left</span>
                    )}
                  </span>
                  <span className="mt-auto flex items-center justify-between gap-2">
                    <span className={cn("font-semibold", product.available ? "text-brand-strong" : "text-muted-foreground")}>
                      {formatCentavos(product.price)}
                    </span>
                    {product.available ? (
                      <span className="flex size-7 items-center justify-center rounded-full bg-success-strong text-white" aria-hidden>
                        <Plus className="size-4" />
                      </span>
                    ) : (
                      <span className="rounded-full bg-destructive-soft px-2 py-0.5 text-xs font-semibold text-destructive">
                        {product.unavailableReason ?? "Unavailable"}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
