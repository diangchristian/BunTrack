"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCentavos, formatShortDate } from "@/lib/format";
import { deleteExpense } from "../actions";
import { expenseBusinesses, type Expense } from "../types";
import { ExpenseDialog } from "./expense-dialog";

const dayLabel = formatShortDate;
const businessLabel = (id: Expense["business"]) => expenseBusinesses.find((b) => b.id === id)!.label;

export function ExpensesManager({ expenses }: { expenses: Expense[] }) {
  const [query, setQuery] = useState("");
  // undefined = closed, null = recording a new one, Expense = editing
  const [editing, setEditing] = useState<Expense | null | undefined>(undefined);
  const [confirmId, setConfirmId] = useState<string>();
  const [error, setError] = useState<string>();
  const [deleting, startDelete] = useTransition();

  const search = query.trim().toLowerCase();
  const rows = expenses.filter((e) =>
    `${e.category} ${e.description} ${businessLabel(e.business)} ${e.paidVia === "cash" ? "Cash" : "GCash"}`.toLowerCase().includes(search),
  );

  function remove(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      // Disarm after a few seconds; blur alone isn't reliable (Safari doesn't focus clicked buttons).
      setTimeout(() => setConfirmId((current) => (current === id ? undefined : current)), 4000);
      return;
    }
    setError(undefined);
    startDelete(async () => {
      const result = await deleteExpense(id);
      if (result.ok) toast.success("Expense deleted");
      else setError(result.error);
      setConfirmId(undefined);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-[15px] font-semibold">Expense history</h2>
        <span className="flex-1" />
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search expenses…" aria-label="Search expenses" className="h-10 pl-9" />
        </div>
        <Button className="h-10 px-4" onClick={() => setEditing(null)}>
          <Plus data-icon="inline-start" /> Record expense
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {expenses.length ? "No expenses match your search." : "No expenses in this period."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-[10px] border">
          <Table className="table-fixed">
            <TableHeader className="bg-secondary">
              <TableRow>
                <TableHead className="w-16 text-xs">Date</TableHead>
                <TableHead className="w-40 text-xs">Category</TableHead>
                <TableHead className="hidden text-xs md:table-cell">Description</TableHead>
                <TableHead className="hidden w-28 text-xs lg:table-cell">For</TableHead>
                <TableHead className="hidden w-20 text-xs sm:table-cell">Paid via</TableHead>
                <TableHead className="w-28 text-right text-xs">Amount</TableHead>
                <TableHead className="w-24 text-right text-xs">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground tabular-nums">{dayLabel(e.date)}</TableCell>
                  <TableCell>
                    <Badge variant="neutral">{e.category}</Badge>
                  </TableCell>
                  <TableCell className="hidden truncate md:table-cell" title={e.description}>
                    {e.description || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{businessLabel(e.business)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{e.paidVia === "cash" ? "Cash" : "GCash"}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCentavos(e.amount)}</TableCell>
                  <TableCell className="text-right">
                    <span className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${e.category} on ${dayLabel(e.date)}`} onClick={() => setEditing(e)}>
                        <Pencil />
                      </Button>
                      <Button
                        variant={confirmId === e.id ? "destructive" : "ghost"}
                        size={confirmId === e.id ? "sm" : "icon-sm"}
                        aria-label={confirmId === e.id ? "Confirm delete" : `Delete ${e.category} on ${dayLabel(e.date)}`}
                        onClick={() => remove(e.id)}
                        onBlur={() => confirmId === e.id && !deleting && setConfirmId(undefined)}
                        disabled={deleting}
                      >
                        {confirmId === e.id ? "Delete?" : <Trash2 className="text-destructive" />}
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editing !== undefined && <ExpenseDialog expense={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
