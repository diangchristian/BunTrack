"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCategory, deleteCategory, moveCategory, renameCategory } from "../actions";
import { ICE_CREAM, type Category } from "../types";

/** Settings → Product categories: add, rename, reorder (POS button order) and delete. */
export function CategoryManager({ categories, productCounts }: { categories: Category[]; productCounts: Record<string, number> }) {
  const [newLabel, setNewLabel] = useState("");
  const [editing, setEditing] = useState<{ id: string; label: string }>();
  const [confirmId, setConfirmId] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, after?: () => void, done?: string) {
    setError(undefined);
    start(async () => {
      const result = await action();
      if (result.ok) {
        after?.();
        if (done) toast.success(done);
      }
      else setError(result.error);
    });
  }

  function remove(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      setTimeout(() => setConfirmId((current) => (current === id ? undefined : current)), 4000);
      return;
    }
    run(() => deleteCategory(id), () => setConfirmId(undefined), `Category deleted: ${categories.find((c) => c.id === id)?.label}`);
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
      <div>
        <h2 className="text-[15px] font-semibold">Product categories</h2>
        <p className="text-xs text-muted-foreground">The order here is the order of the category buttons on the POS.</p>
      </div>

      <ul className="flex flex-col divide-y rounded-[10px] border">
        {categories.map((c, i) => {
          const count = productCounts[c.id] ?? 0;
          const locked = c.id === ICE_CREAM;
          return (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2">
              {editing?.id === c.id ? (
                <form
                  className="flex flex-1 items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(() => renameCategory(c.id, editing.label), () => setEditing(undefined), `Category renamed to ${editing.label.trim()}`);
                  }}
                >
                  <Input
                    aria-label={`New name for ${c.label}`}
                    value={editing.label}
                    onChange={(e) => setEditing({ id: c.id, label: e.target.value })}
                    maxLength={30}
                    autoFocus
                    className="h-9 flex-1"
                  />
                  <Button type="submit" size="icon-sm" aria-label="Save name" disabled={pending}>
                    <Check />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel" onClick={() => setEditing(undefined)}>
                    <X />
                  </Button>
                </form>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">
                    {c.label}
                    {locked && <Lock className="ml-1.5 inline size-3.5 text-muted-foreground" aria-label="Locked" />}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {count} {count === 1 ? "product" : "products"}
                  </span>
                  <Button variant="ghost" size="icon-sm" aria-label={`Move ${c.label} up`} disabled={pending || i === 0} onClick={() => run(() => moveCategory(c.id, -1))}>
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${c.label} down`}
                    disabled={pending || i === categories.length - 1}
                    onClick={() => run(() => moveCategory(c.id, 1))}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Rename ${c.label}`}
                    disabled={locked}
                    title={locked ? "Ice Cream marks the Dan Eric items, so it can't be renamed" : undefined}
                    onClick={() => setEditing({ id: c.id, label: c.label })}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant={confirmId === c.id ? "destructive" : "ghost"}
                    size={confirmId === c.id ? "sm" : "icon-sm"}
                    aria-label={confirmId === c.id ? `Confirm delete ${c.label}` : `Delete ${c.label}`}
                    disabled={pending || locked || count > 0}
                    title={locked ? "Ice Cream can't be deleted" : count > 0 ? "Move its products to another category first" : undefined}
                    onClick={() => remove(c.id)}
                  >
                    {confirmId === c.id ? "Delete?" : <Trash2 className="text-destructive" />}
                  </Button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addCategory(newLabel), () => setNewLabel(""), `Category added: ${newLabel.trim()}`);
        }}
      >
        <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Rice Meals" maxLength={30} aria-label="New category name" className="h-10 flex-1" />
        <Button type="submit" variant="outline" className="h-10" disabled={pending || !newLabel.trim()}>
          <Plus data-icon="inline-start" /> Add category
        </Button>
      </form>

      {error && (
        <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Ice Cream is locked because it marks the Dan Eric items (dealer price, own stock, Ice Cream reports). A category with products can&apos;t be deleted.
      </p>
    </section>
  );
}
