"use client";

import { useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCentavos } from "@/lib/format";
import { cn } from "@/lib/utils";
import { formatQuantity, perUnitLabel, stockStatus, stockValue } from "../costing";
import { itemCategories, units, type InventoryItem, type MovementType, type StockMovement } from "../types";
import { AddItemDialog } from "./add-item-dialog";
import { MovementDialog } from "./movement-dialog";

const status = {
  in: { label: "In Stock", badge: "success", bar: "bg-success" },
  low: { label: "Low Stock", badge: "warning", bar: "bg-warning" },
  out: { label: "Out of Stock", badge: "danger", bar: "bg-destructive" },
} as const;
const movementLabel: Record<MovementType, { label: string; badge: "success" | "neutral" | "danger" | "brand" }> = {
  "stock-in": { label: "Stock In", badge: "success" },
  adjustment: { label: "Adjustment", badge: "neutral" },
  waste: { label: "Waste", badge: "danger" },
  sale: { label: "Sale", badge: "brand" },
};

const categoryFilter = [{ value: "all", label: "All categories" }, ...itemCategories.map((c) => ({ value: c, label: c }))];
const statusFilter = [
  { value: "all", label: "All status" },
  { value: "in", label: "In Stock" },
  { value: "low", label: "Low Stock" },
  { value: "out", label: "Out of Stock" },
];

const HISTORY_PAGE_SIZE = 50;

type DialogState = { kind: "movement"; itemId?: string; type: Exclude<MovementType, "sale"> } | { kind: "add" } | null;

export function InventoryManager({
  items,
  movements,
  usedBy,
}: {
  items: InventoryItem[];
  movements: StockMovement[];
  usedBy: Record<string, string[]>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [statusId, setStatusId] = useState("all");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [historyShown, setHistoryShown] = useState(HISTORY_PAGE_SIZE);

  const search = query.trim().toLowerCase();
  const visible = items.filter(
    (i) =>
      (category === "all" || i.category === category) &&
      (statusId === "all" || stockStatus(i) === statusId) &&
      i.name.toLowerCase().includes(search),
  );
  // Movements are newest first, so the first Stock In per item is where it was last bought.
  const lastPlace: Record<string, string> = {};
  for (const m of movements) if (m.type === "stock-in" && m.supplier) lastPlace[m.itemId] ??= m.supplier;
  const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? "Removed item";
  const itemUnit = (id: string) => items.find((i) => i.id === id)?.unit ?? "pcs";

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
      <Tabs defaultValue="items">
        <div className="flex flex-wrap items-center gap-3">
          <TabsList variant="line">
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="history">Movement history</TabsTrigger>
          </TabsList>
          <span className="flex-1" />
          <Button variant="outline" className="h-10" onClick={() => setDialog({ kind: "movement", type: "waste" })}>
            <Trash2 data-icon="inline-start" /> Record waste
          </Button>
          <Button variant="outline" className="h-10" onClick={() => setDialog({ kind: "add" })}>
            <Plus data-icon="inline-start" /> Add item
          </Button>
          <Button className="h-10 px-4" onClick={() => setDialog({ kind: "movement", type: "stock-in" })}>
            <Plus data-icon="inline-start" /> Stock In
          </Button>
        </div>

        <TabsContent value="items" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-48 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items…" aria-label="Search items" className="h-10 pl-9" />
            </div>
            <FilterSelect label="Category" items={categoryFilter} value={category} onChange={setCategory} />
            <FilterSelect label="Status" items={statusFilter} value={statusId} onChange={setStatusId} />
          </div>

          <div className="overflow-hidden rounded-[10px] border">
            <Table>
              <TableHeader className="bg-secondary">
                <TableRow>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs">Stock level</TableHead>
                  <TableHead className="hidden text-xs md:table-cell">Min. threshold</TableHead>
                  <TableHead className="hidden text-right text-xs lg:table-cell">Unit cost</TableHead>
                  <TableHead className="hidden text-right text-xs sm:table-cell">Stock value</TableHead>
                  <TableHead className="hidden text-xs sm:table-cell">Status</TableHead>
                  <TableHead className="w-48 text-right text-xs">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      {items.length === 0 ? (
                        <div className="flex flex-col items-center gap-3">
                          <p>
                            <span className="block font-semibold text-foreground">No items yet</span>
                            Add the ingredients and supplies you buy or make, then record what you have.
                          </p>
                          <Button className="h-10 px-4" onClick={() => setDialog({ kind: "add" })}>
                            <Plus data-icon="inline-start" /> Add item
                          </Button>
                        </div>
                      ) : (
                        "No items match these filters."
                      )}
                    </TableCell>
                  </TableRow>
                )}
                {visible.map((item) => {
                  const s = stockStatus(item);
                  const unitLabel = perUnitLabel(item.unit);
                  // The bar is full at twice the reorder point, like the Figma design.
                  const fill = item.minimum ? Math.min(1, item.quantity / (item.minimum * 2)) : item.quantity > 0 ? 1 : 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.category}
                          {item.homemade && " · Made in-house"}
                          {item.packSize && ` · pack of ${formatQuantity(item.packSize, item.unit)}`}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className={cn("font-semibold tabular-nums", s === "out" ? "text-destructive" : s === "low" && "text-warning")}>
                          {formatQuantity(item.quantity, item.unit)}
                          {/* The Status column is hidden on phones, so say it in words, not only colour. */}
                          {s !== "in" && <span className="ml-1.5 text-xs sm:hidden">{s === "out" ? "Out" : "Low"}</span>}
                        </p>
                        <div className="mt-1.5 h-1.5 w-32 rounded-full bg-neutral-soft" aria-hidden>
                          <div className={cn("h-1.5 rounded-full", status[s].bar)} style={{ width: `${fill * 100}%` }} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{formatQuantity(item.minimum, item.unit)}</TableCell>
                      <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">
                        {item.unitCost ? `${formatCentavos(item.unitCost)} / ${unitLabel}` : "No cost yet"}
                      </TableCell>
                      <TableCell className="hidden text-right font-semibold tabular-nums sm:table-cell">
                        {formatCentavos(Math.round(stockValue(item)))}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={status[s].badge}>{status[s].label}</Badge>
                        {s === "out" && usedBy[item.id]?.length ? (
                          <p className="mt-1 max-w-40 truncate text-xs text-destructive" title={usedBy[item.id].join(", ")}>
                            Blocks {usedBy[item.id].join(", ")}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setDialog({ kind: "movement", itemId: item.id, type: "stock-in" })}>
                            <Plus data-icon="inline-start" /> Restock
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDialog({ kind: "movement", itemId: item.id, type: "adjustment" })}>
                            <Pencil data-icon="inline-start" /> Adjust
                          </Button>
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {movements.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No stock movements yet. Stock In, adjustments, waste and POS sales will show here.
            </p>
          ) : (
            <div className="overflow-hidden rounded-[10px] border">
              <Table>
                <TableHeader className="bg-secondary">
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-right text-xs">Change</TableHead>
                    <TableHead className="hidden text-xs md:table-cell">Details</TableHead>
                    <TableHead className="hidden text-xs sm:table-cell">By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.slice(0, historyShown).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground tabular-nums">{m.date}</TableCell>
                      <TableCell className="font-semibold">{itemName(m.itemId)}</TableCell>
                      <TableCell>
                        <Badge variant={movementLabel[m.type].badge}>{movementLabel[m.type].label}</Badge>
                      </TableCell>
                      <TableCell className={cn("text-right font-semibold tabular-nums", m.change < 0 ? "text-destructive" : "text-success-strong")}>
                        {m.change > 0 ? "+" : m.change < 0 ? "−" : ""}
                        {formatQuantity(Math.abs(m.change), itemUnit(m.itemId), units[itemUnit(m.itemId)].factor > 1 && Math.abs(m.change) < 1000 ? "serving" : "stock")}
                      </TableCell>
                      <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">
                        {[m.reference, m.supplier, m.unitCost !== undefined && `${formatCentavos(m.unitCost)} / unit`, m.note].filter(Boolean).join(" · ")}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{m.by}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {movements.length > historyShown && (
                <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
                  Showing {historyShown} of {movements.length}
                  <Button variant="outline" size="sm" onClick={() => setHistoryShown((n) => n + HISTORY_PAGE_SIZE)}>
                    Show {Math.min(HISTORY_PAGE_SIZE, movements.length - historyShown)} more
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {dialog?.kind === "movement" && (
        <MovementDialog open initial={dialog} items={items} usedBy={usedBy} lastPlace={lastPlace} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "add" && <AddItemDialog open onClose={() => setDialog(null)} />}
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
      <SelectTrigger aria-label={label} size="lg" className="w-48">
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
