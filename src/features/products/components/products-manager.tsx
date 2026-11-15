"use client";

import { useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCentavos } from "@/lib/format";
import { productMargin } from "../costing";
import { categoryLabel, type Category } from "@/features/categories/types";
import { isOnSale, unavailableReason, type CostedProduct } from "../types";
import { ProductDialog } from "./product-dialog";
import { ProductImage } from "./product-image";

const statusFilter = [
  { value: "all", label: "All status" },
  { value: "available", label: "Available" },
  { value: "unavailable", label: "Unavailable" },
];

export function ProductsManager({ products, categories }: { products: CostedProduct[]; categories: Category[] }) {
  const categoryFilter = [{ value: "all", label: "All categories" }, ...categories.map((c) => ({ value: c.id, label: c.label }))];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  // undefined = drawer closed, null = adding, Product = editing
  const [editing, setEditing] = useState<CostedProduct | null | undefined>(undefined);

  const search = query.trim().toLowerCase();
  const visible = products.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      (status === "all" || (status === "available") === isOnSale(p)) &&
      (p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search)),
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products…" aria-label="Search products" className="h-10 pl-9" />
        </div>
        <FilterSelect label="Category" items={categoryFilter} value={category} onChange={setCategory} />
        <FilterSelect label="Status" items={statusFilter} value={status} onChange={setStatus} />
        <span className="flex-1" />
        <Button className="h-10 px-4" onClick={() => setEditing(null)}>
          <Plus data-icon="inline-start" /> Add Product
        </Button>
      </div>

      <div className="overflow-hidden rounded-[10px] border">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="text-xs">Product</TableHead>
              <TableHead className="hidden text-xs md:table-cell">Category</TableHead>
              <TableHead className="text-right text-xs">Selling Price</TableHead>
              <TableHead className="hidden text-right text-xs lg:table-cell">Cost</TableHead>
              <TableHead className="hidden text-right text-xs sm:table-cell">Est. Profit</TableHead>
              <TableHead className="hidden text-xs sm:table-cell">Status</TableHead>
              <TableHead className="w-16 text-right text-xs">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No products match these filters.
                </TableCell>
              </TableRow>
            )}
            {visible.map((product) => {
              const margin = productMargin(product.price, product.cost);
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <ProductImage product={product} sizes="40px" className="size-10" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {product.name}
                          {product.pieces === 2 && (
                            <Badge variant="brand" className="ml-1.5 align-middle">
                              B1T1
                            </Badge>
                          )}
                        </p>
                        <p className="max-w-64 truncate text-xs text-muted-foreground">{product.description}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{categoryLabel(product.category, categories)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCentavos(product.price)}</TableCell>
                  <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">
                    {product.hasRecipe ? formatCentavos(product.cost) : "No recipe"}
                  </TableCell>
                  <TableCell className="hidden text-right sm:table-cell">
                    {product.hasRecipe ? (
                      <>
                        <p className={margin.profit >= 0 ? "font-semibold text-success-strong tabular-nums" : "font-semibold text-destructive tabular-nums"}>
                          {formatCentavos(margin.profit)}
                        </p>
                        <p className="text-xs text-muted-foreground">{margin.marginPercent}% margin</p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={!product.available ? "danger" : product.servingsLeft === 0 ? "warning" : "success"}>
                      {unavailableReason(product) ?? "Available"}
                    </Badge>
                    {product.servingsLeft !== null && product.servingsLeft > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">{product.servingsLeft} left</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(product)} aria-label={`Edit ${product.name}`}>
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing {visible.length} of {products.length} products
      </p>

      {editing !== undefined && <ProductDialog product={editing} categories={categories} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

function FilterSelect({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select items={items} value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger aria-label={label} size="lg" className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
