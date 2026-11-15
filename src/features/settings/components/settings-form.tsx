"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/features/inventory/components/movement-dialog";
import { keepValuesOnSubmit } from "@/lib/forms";
import { saveSettings, type SettingsFormState } from "../actions";
import type { Settings } from "../schemas";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, saving] = useActionState(saveSettings, {} as SettingsFormState);
  // Live receipt preview while typing; the server validates on save.
  const [draft, setDraft] = useState(settings);
  const errors = state.fieldErrors ?? {};
  const set = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [key]: e.target.value });

  return (
    <form onSubmit={keepValuesOnSubmit(formAction)} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
          <div>
            <h2 className="text-[15px] font-semibold">Business profile</h2>
            <p className="text-xs text-muted-foreground">Shown on receipts and the dashboard</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shop name" htmlFor="shopName" error={errors.shopName?.[0]}>
              <Input id="shopName" name="shopName" value={draft.shopName} onChange={set("shopName")} maxLength={60} required className="h-10" />
            </Field>
            <Field label="Contact number" htmlFor="contactNumber" error={errors.contactNumber?.[0]}>
              <Input id="contactNumber" name="contactNumber" value={draft.contactNumber} onChange={set("contactNumber")} maxLength={30} placeholder="e.g. 0917 123 4567" className="h-10" />
            </Field>
            <Field label="Address" htmlFor="address" error={errors.address?.[0]}>
              <Input id="address" name="address" value={draft.address} onChange={set("address")} maxLength={120} placeholder="Street, barangay, city" className="h-10" />
            </Field>
            <Field label="Currency" htmlFor="currency">
              <Input id="currency" value="PHP · Philippine Peso (₱)" disabled className="h-10" />
            </Field>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
          <div>
            <h2 className="text-[15px] font-semibold">Receipt</h2>
            <p className="text-xs text-muted-foreground">Printed under the totals on every receipt. Prices have no VAT line.</p>
          </div>
          <Field label="Footer message" htmlFor="receiptFooter" error={errors.receiptFooter?.[0]}>
            <Input id="receiptFooter" name="receiptFooter" value={draft.receiptFooter} onChange={set("receiptFooter")} maxLength={80} className="h-10" />
          </Field>
        </section>

        {state.error && (
          <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state.ok && !saving && JSON.stringify(draft) === JSON.stringify(settings) && (
          <p role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-success-strong">
            Settings saved.
          </p>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-10" onClick={() => setDraft(settings)} disabled={saving}>
            Discard changes
          </Button>
          <Button type="submit" className="h-10 px-5 font-semibold" disabled={saving}>
            <Check data-icon="inline-start" /> {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      <section aria-label="Receipt preview" className="flex h-fit flex-col gap-3 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
        <h2 className="text-[15px] font-semibold">Receipt preview</h2>
        <div className="flex flex-col gap-2 rounded-[10px] border bg-secondary p-4 text-xs">
          <p className="text-sm font-semibold">{draft.shopName || "Shop name"}</p>
          {draft.address && <p className="text-muted-foreground">{draft.address}</p>}
          {draft.contactNumber && <p className="text-muted-foreground">{draft.contactNumber}</p>}
          <p className="flex justify-between border-t border-input pt-2">
            <span className="text-muted-foreground">2× Classic Cheeseburger</span>
            <span className="tabular-nums">₱298.00</span>
          </p>
          <p className="flex justify-between font-semibold">
            <span>Total</span>
            <span className="tabular-nums">₱298.00</span>
          </p>
          {draft.receiptFooter && <p className="border-t border-input pt-2 text-center text-muted-foreground">{draft.receiptFooter}</p>}
        </div>
      </section>
    </form>
  );
}
