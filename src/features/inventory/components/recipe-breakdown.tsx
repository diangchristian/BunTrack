"use client";

import { useState, useTransition } from "react";
import { History, Pencil, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCentavos } from "@/lib/format";
import { saveRecipe } from "../actions";
import { formatQuantity, lineCost } from "../costing";
import { units, type InventoryItem, type RecipeLine } from "../types";

/** Ingredient breakdown for one product, with an edit mode for its recipe. */
export function RecipeBreakdown({
  productId,
  recipe,
  items,
  resold,
  pieces,
}: {
  productId: string;
  recipe: RecipeLine[];
  items: InventoryItem[];
  resold: boolean;
  /** 2 for Buy 1 Take 1: the recipe is per piece and each order uses 2. */
  pieces: number;
}) {
  const [draft, setDraft] = useState<RecipeLine[] | null>(null); // null = viewing
  const [adding, setAdding] = useState({ itemId: "", quantity: "" });
  const [error, setError] = useState<string>();
  const [saving, startSave] = useTransition();

  const lines = draft ?? recipe;
  const rows = lines.flatMap((line) => {
    const item = items.find((i) => i.id === line.itemId);
    return item ? [{ line, item, cost: lineCost(line, item) }] : [];
  });
  const total = rows.reduce((sum, r) => sum + r.cost, 0);
  const unused = items.filter((i) => !lines.some((l) => l.itemId === i.id));
  const addItem = items.find((i) => i.id === adding.itemId);

  function save() {
    if (!draft) return;
    setError(undefined);
    startSave(async () => {
      const result = await saveRecipe(productId, draft);
      if (result.ok) setDraft(null);
      else setError(result.error);
    });
  }

  function addLine() {
    const quantity = Number(adding.quantity);
    if (!addItem || !Number.isInteger(quantity) || quantity <= 0) return;
    setDraft([...lines, { itemId: addItem.id, quantity }]);
    setAdding({ itemId: "", quantity: "" });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Ingredient breakdown</h2>
          <p className="text-xs text-muted-foreground">
            {resold
              ? "Dan Eric item: its cost is the dealer price you pay per unit."
              : pieces === 2
                ? "Per piece · Buy 1 Take 1, so each order uses 2 pieces"
                : "Per serving · unit costs pulled from Inventory"}
          </p>
        </div>
        {draft === null ? (
          <Button variant="ghost" size="sm" onClick={() => setDraft(recipe)}>
            <Pencil data-icon="inline-start" /> Edit recipe
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => (setDraft(null), setError(undefined))} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save recipe"}
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-[10px] border">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="text-xs">Ingredient</TableHead>
              <TableHead className="text-xs">Qty / serving</TableHead>
              <TableHead className="hidden text-xs sm:table-cell">Unit cost</TableHead>
              <TableHead className="text-right text-xs">Cost</TableHead>
              <TableHead className="hidden w-36 text-xs md:table-cell">Share of cost</TableHead>
              {draft && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No recipe yet. Click Edit recipe and add what one serving uses.
                </TableCell>
              </TableRow>
            )}
            {rows.map(({ line, item, cost }) => (
              <TableRow key={item.id}>
                <TableCell className="font-semibold">{item.name}</TableCell>
                <TableCell>
                  {draft ? (
                    <span className="flex items-center gap-1.5">
                      <Input
                        aria-label={`${item.name} per serving (${units[item.unit].small})`}
                        inputMode="numeric"
                        value={String(line.quantity)}
                        onChange={(e) => {
                          const quantity = Number(e.target.value.replace(/\D/g, "")) || 0;
                          setDraft(lines.map((l) => (l.itemId === item.id ? { ...l, quantity } : l)));
                        }}
                        className="h-8 w-20 tabular-nums"
                      />
                      <span className="text-xs text-muted-foreground">{units[item.unit].small}</span>
                    </span>
                  ) : (
                    formatQuantity(line.quantity, item.unit, "serving")
                  )}
                </TableCell>
                <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                  {formatCentavos(item.unitCost)} / {item.unit === "pcs" ? "pc" : units[item.unit].label}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCentavos(Math.round(cost))}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-16 rounded-full bg-neutral-soft" aria-hidden>
                      <span className="block h-1.5 rounded-full bg-chart-1" style={{ width: `${total ? (cost / total) * 100 : 0}%` }} />
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{total ? ((cost / total) * 100).toFixed(1) : "0.0"}%</span>
                  </span>
                </TableCell>
                {draft && (
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove ${item.name}`} onClick={() => setDraft(lines.filter((l) => l.itemId !== item.id))}>
                      <X />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="font-semibold">
                  {pieces === 2 ? "Production cost per piece" : "Total production cost"}
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCentavos(Math.round(total))}</TableCell>
                <TableCell colSpan={draft ? 2 : 1} className="hidden md:table-cell" />
              </TableRow>
              {pieces === 2 && (
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold">
                    Per order (Buy 1 Take 1 × 2)
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{formatCentavos(Math.round(total) * 2)}</TableCell>
                  <TableCell colSpan={draft ? 2 : 1} className="hidden md:table-cell" />
                </TableRow>
              )}
            </TableFooter>
          )}
        </Table>
      </div>

      {draft && (
        <div className="flex flex-wrap items-end gap-2 rounded-[10px] border border-dashed p-3">
          <Select items={unused.map((i) => ({ value: i.id, label: i.name }))} value={adding.itemId} onValueChange={(v) => v && setAdding({ ...adding, itemId: v })}>
            <SelectTrigger aria-label="Ingredient to add" className="h-9 w-52">
              <SelectValue placeholder="Add an ingredient…" />
            </SelectTrigger>
            <SelectContent>
              {unused.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="flex items-center gap-1.5">
            <Input
              aria-label="Amount per serving"
              inputMode="numeric"
              placeholder={addItem?.unit === "pcs" ? "1" : "15"}
              value={adding.quantity}
              onChange={(e) => setAdding({ ...adding, quantity: e.target.value.replace(/\D/g, "") })}
              className="h-9 w-20 tabular-nums"
            />
            <span className="text-xs text-muted-foreground">{addItem ? units[addItem.unit].small : ""}</span>
          </span>
          <Button variant="outline" size="sm" className="h-9" onClick={addLine} disabled={!addItem || !Number(adding.quantity)}>
            <Plus data-icon="inline-start" /> Add
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <p className="flex gap-2 rounded-[10px] border bg-secondary p-3 text-xs text-muted-foreground">
        <History className="mt-0.5 size-4 shrink-0" aria-hidden />
        When an item&apos;s purchase cost changes (Stock In), this breakdown updates automatically.
      </p>
    </div>
  );
}
