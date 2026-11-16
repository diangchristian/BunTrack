"use server";

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { logActivity } from "@/features/activity/log";
import { canAdminister, getCurrentUser } from "@/features/auth/queries";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formText } from "@/lib/forms";
import { listUsers } from "./queries";
import { addError, EMAIL_TAKEN, setActiveError, updateError } from "./rules";
import { newUserSchema, userFormSchema } from "./schemas";

export type UserFormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> };

// Email + password sign-in reads the hash from the user's "credential" account (Better Auth's shape;
// the credential account's accountId is the user's own id).
const CREDENTIAL = "credential";
const credentialAccount = (userId: string, hash: string) => ({ id: randomUUID(), providerId: CREDENTIAL, accountId: userId, password: hash });

/** Adds an account, or edits one when the form includes an id. Owner only. */
export async function saveUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  if (!(await canAdminister())) return { error: "Only an administrator can manage accounts." };

  const id = formText(formData, "id");
  const parsed = (id ? userFormSchema : newUserSchema).safeParse(
    Object.fromEntries(["name", "email", "role", "password"].map((k) => [k, formText(formData, k)])),
  );
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { password, ...values } = parsed.data;

  const [users, me] = await Promise.all([listUsers(), getCurrentUser()]);
  const error = id ? updateError(users, id, values, me.id) : addError(users, values);
  if (error) return { error };

  // Hashing is slow on purpose, so do it before opening a transaction.
  const hash = password ? await hashPassword(password) : null;

  try {
    if (id) {
      const before = users.find((u) => u.id === id)!;
      await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id }, data: values });
        if (!hash) return;
        const updated = await tx.account.updateMany({ where: { userId: id, providerId: CREDENTIAL }, data: { password: hash } });
        if (updated.count === 0) await tx.account.create({ data: { userId: id, ...credentialAccount(id, hash) } });
        // A new password signs them out everywhere. Your own reset keeps this device (below).
        if (id !== me.id) await tx.session.deleteMany({ where: { userId: id } });
      });
      if (hash && id === me.id) await auth.api.revokeOtherSessions({ headers: await headers() });
      const changes = [
        before.name !== values.name && `Name ${before.name} → ${values.name}`,
        before.email !== values.email && `Email ${before.email} → ${values.email}`,
        before.role !== values.role && `Role ${before.role} → ${values.role}`,
        password && "Password changed",
      ].filter(Boolean);
      await logActivity({
        module: "Users",
        action: before.role !== values.role ? "Role changed" : password ? "Password changed" : "Account updated",
        record: before.name,
        change: changes.join(" · ") || "No changes",
      });
    } else {
      // Public sign-up is off (src/lib/auth.ts), so accounts are written in Better Auth's shape here.
      const userId = randomUUID();
      await db.user.create({
        data: {
          id: userId,
          ...values,
          accounts: { create: credentialAccount(userId, hash!) },
        },
      });
      await logActivity({ module: "Users", action: "Account added", record: values.name, change: values.role });
    }
  } catch (e) {
    // Two admins saving the same email at once: the unique index catches what the rules couldn't.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: EMAIL_TAKEN };
    throw e;
  }
  refresh();
  return { ok: true };
}

export async function setUserActive(id: string, active: boolean): Promise<UserFormState> {
  if (!(await canAdminister())) return { error: "Only an administrator can manage accounts." };
  const [users, me] = await Promise.all([listUsers(), getCurrentUser()]);
  const error = setActiveError(users, id, active, me.id);
  if (error) return { error };

  await db.$transaction([
    db.user.update({ where: { id }, data: { active } }),
    // Deactivating ends their sessions too, so an old cookie can't keep using /api/auth.
    ...(active ? [] : [db.session.deleteMany({ where: { userId: id } })]),
  ]);
  await logActivity({ module: "Users", action: active ? "Account reactivated" : "Account deactivated", record: users.find((u) => u.id === id)!.name });
  refresh();
  return { ok: true };
}
