"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { logActivity } from "@/features/activity/log";
import { formText } from "@/lib/forms";
import { canAdminister } from "@/features/auth/queries";
import { settingsSchema } from "./schemas";
import { settingsStore } from "./store";

export type SettingsFormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> };

export async function saveSettings(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  if (!(await canAdminister())) return { error: "Only an administrator can change settings." };

  const parsed = settingsSchema.safeParse(Object.fromEntries(["shopName", "contactNumber", "address", "receiptFooter"].map((k) => [k, formText(formData, k)])));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const before = settingsStore.get();
  const changed = (Object.keys(parsed.data) as (keyof typeof parsed.data)[]).filter((k) => before[k] !== parsed.data[k]);
  if (changed.length === 0) return { ok: true };

  settingsStore.set(parsed.data);
  const labels = { shopName: "shop name", contactNumber: "contact number", address: "address", receiptFooter: "receipt footer" };
  await logActivity({ module: "Settings", action: "Settings updated", record: "Business profile", change: changed.map((k) => labels[k]).join(", ") });
  refresh();
  return { ok: true };
}
