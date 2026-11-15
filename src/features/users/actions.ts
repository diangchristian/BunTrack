"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { formText } from "@/lib/forms";
import { logActivity } from "@/features/activity/log";
import { canAdminister, getCurrentUser } from "@/features/auth/queries";
import { userFormSchema } from "./schemas";
import { userStore } from "./store";

export type UserFormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> };

/** Adds an account, or edits one when the form includes an id. Owner only. */
export async function saveUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  if (!(await canAdminister())) return { error: "Only an administrator can manage accounts." };

  const parsed = userFormSchema.safeParse(Object.fromEntries(["name", "email", "role"].map((k) => [k, formText(formData, k)])));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const id = formText(formData, "id");
  if (id) {
    const before = userStore.list().find((u) => u.id === id);
    const result = userStore.update(id, parsed.data, (await getCurrentUser()).id);
    if (!result.ok) return { error: result.error };
    const changes = before
      ? [
          before.name !== parsed.data.name && `Name ${before.name} → ${parsed.data.name}`,
          before.email !== parsed.data.email && `Email ${before.email} → ${parsed.data.email}`,
          before.role !== parsed.data.role && `Role ${before.role} → ${parsed.data.role}`,
        ].filter(Boolean)
      : [];
    await logActivity({
      module: "Users",
      action: before && before.role !== parsed.data.role ? "Role changed" : "Account updated",
      record: before?.name ?? parsed.data.name,
      change: changes.join(" · ") || "No changes",
    });
  } else {
    const result = userStore.add(parsed.data);
    if (!result.ok) return { error: result.error };
    await logActivity({ module: "Users", action: "Account added", record: parsed.data.name, change: parsed.data.role });
  }
  refresh();
  return { ok: true };
}

export async function setUserActive(id: string, active: boolean): Promise<UserFormState> {
  if (!(await canAdminister())) return { error: "Only an administrator can manage accounts." };
  const user = userStore.list().find((u) => u.id === id);
  const result = userStore.setActive(id, active, (await getCurrentUser()).id);
  if (!result.ok || !user) return { error: result.ok ? "This account no longer exists." : result.error };
  await logActivity({ module: "Users", action: active ? "Account reactivated" : "Account deactivated", record: user.name });
  refresh();
  return { ok: true };
}
