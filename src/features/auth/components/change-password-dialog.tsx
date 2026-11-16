"use client";

import { useActionState, useState } from "react";
import { Check, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/features/inventory/components/movement-dialog";
import { keepValuesOnSubmit } from "@/lib/forms";
import { changePassword } from "../actions";
import type { ChangePasswordState } from "../schemas";

/** The key button in the sidebar's account card, and the dialog it opens. */
export function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        title="Change password"
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
      >
        <KeyRound className="size-4" aria-hidden />
        <span className="sr-only">Change password</span>
      </button>
      {/* Mounted only while open, so each visit starts with empty fields. */}
      {open && <ChangePasswordDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const [state, formAction, saving] = useActionState(async (prev: ChangePasswordState, formData: FormData) => {
    const result = await changePassword(prev, formData);
    if (result.ok) {
      toast.success("Password changed. Other devices were signed out.");
      onClose();
    }
    return result;
  }, {});
  const errors = state.errors ?? {};

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={keepValuesOnSubmit(formAction)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Change password</DialogTitle>
            <DialogDescription>You stay signed in here. Any other phone or computer using your account is signed out.</DialogDescription>
          </DialogHeader>
          <Field label="Current password" htmlFor="current-password" error={errors.currentPassword?.[0]}>
            <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required className="h-10" />
          </Field>
          <Field label="New password" htmlFor="new-password" error={errors.newPassword?.[0]}>
            <Input
              id="new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              placeholder="At least 8 characters"
              className="h-10"
            />
          </Field>
          <Field label="Confirm new password" htmlFor="confirm-password" error={errors.confirmPassword?.[0]}>
            <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required className="h-10" />
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
              <Check data-icon="inline-start" /> {saving ? "Saving…" : "Change password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
