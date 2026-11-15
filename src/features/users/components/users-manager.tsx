"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Pencil, Plus, Search, UserCheck, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Field } from "@/features/inventory/components/movement-dialog";
import { keepValuesOnSubmit } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { saveUser, setUserActive, type UserFormState } from "../actions";
import { roles, type User } from "../types";

const roleBadge = { Administrator: "brand", Manager: "neutral", Cashier: "success" } as const;
const initials = (name: string) => name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

export function UsersManager({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const [query, setQuery] = useState("");
  // undefined = closed, null = adding, User = editing
  const [editing, setEditing] = useState<User | null | undefined>(undefined);
  const [confirmId, setConfirmId] = useState<string>();
  const [error, setError] = useState<string>();
  const [saving, startSave] = useTransition();

  const q = query.trim().toLowerCase();
  const rows = users.filter((u) => `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q));

  function toggle(user: User) {
    // Deactivating asks once more; reactivating doesn't need to.
    if (user.active && confirmId !== user.id) {
      setConfirmId(user.id);
      setTimeout(() => setConfirmId((current) => (current === user.id ? undefined : current)), 4000);
      return;
    }
    setError(undefined);
    startSave(async () => {
      const result = await setUserActive(user.id, !user.active);
      if (!result.ok) setError(result.error);
      setConfirmId(undefined);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Accounts</h2>
          <p className="text-xs text-muted-foreground">Family members who use BunTrack</p>
        </div>
        <span className="flex-1" />
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search accounts…" aria-label="Search accounts" className="h-10 pl-9" />
        </div>
        <Button className="h-10 px-4" onClick={() => setEditing(null)}>
          <Plus data-icon="inline-start" /> Add Account
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-[10px] border">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Role</TableHead>
              <TableHead className="hidden text-xs sm:table-cell">Status</TableHead>
              <TableHead className="w-32 text-right text-xs">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                        u.active ? "bg-success-strong" : "bg-muted-foreground",
                      )}
                      aria-hidden
                    >
                      {initials(u.name)}
                    </span>
                    <div className="min-w-0">
                      <p className={cn("truncate font-semibold", !u.active && "text-muted-foreground")}>
                        {u.name}
                        {u.id === currentUserId && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={roleBadge[u.role]}>{u.role}</Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant={u.active ? "success" : "neutral"}>{u.active ? "Active" : "Deactivated"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${u.name}`} onClick={() => setEditing(u)}>
                      <Pencil />
                    </Button>
                    {u.id !== currentUserId && (
                      <Button
                        variant={confirmId === u.id ? "destructive" : "ghost"}
                        size={confirmId === u.id ? "sm" : "icon-sm"}
                        aria-label={u.active ? (confirmId === u.id ? "Confirm deactivate" : `Deactivate ${u.name}`) : `Reactivate ${u.name}`}
                        onClick={() => toggle(u)}
                        disabled={saving}
                      >
                        {confirmId === u.id ? "Deactivate?" : u.active ? <UserX className="text-destructive" /> : <UserCheck className="text-success-strong" />}
                      </Button>
                    )}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing !== undefined && <UserDialog user={editing} isSelf={editing?.id === currentUserId} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

const roleItems = roles.map((r) => ({ value: r.id, label: r.id }));

function UserDialog({ user, isSelf, onClose }: { user: User | null; isSelf: boolean; onClose: () => void }) {
  const [state, formAction, saving] = useActionState(async (prev: UserFormState, formData: FormData) => {
    const result = await saveUser(prev, formData);
    if (result.ok) onClose();
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={keepValuesOnSubmit(formAction)} className="flex flex-col gap-4">
          {user && <input type="hidden" name="id" value={user.id} />}
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{user ? "Edit Account" : "Add Account"}</DialogTitle>
            <DialogDescription>Passwords are set once real sign-in is connected.</DialogDescription>
          </DialogHeader>
          <Field label="Name" htmlFor="user-name" error={errors.name?.[0]}>
            <Input id="user-name" name="name" defaultValue={user?.name} maxLength={60} required className="h-10" />
          </Field>
          <Field label="Email" htmlFor="user-email" error={errors.email?.[0]}>
            <Input id="user-email" name="email" type="email" defaultValue={user?.email} required className="h-10" />
          </Field>
          <Field label="Role" htmlFor="user-role" error={errors.role?.[0]}>
            {isSelf ? (
              <>
                <input type="hidden" name="role" value={user!.role} />
                <p className="text-sm text-muted-foreground">{user!.role} (you can&apos;t change your own role)</p>
              </>
            ) : (
              <Select name="role" items={roleItems} defaultValue={user?.role ?? "Cashier"}>
                <SelectTrigger id="user-role" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
          {state.error && (
            <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-10" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="h-10 font-semibold" disabled={saving}>
              <Check data-icon="inline-start" /> {saving ? "Saving…" : "Save Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
