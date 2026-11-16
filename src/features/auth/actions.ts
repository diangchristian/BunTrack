"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ACCOUNT_DEACTIVATED, auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lockedForMinutes, LOGIN_WINDOW_MS } from "./rate-limit";
import { changePasswordSchema, loginSchema, type ChangePasswordState, type LoginFormState } from "./schemas";

export async function login(_prev: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const raw = formData.get("identifier");
  const result = loginSchema.safeParse({ identifier: raw, password: formData.get("password") });
  const typed = typeof raw === "string" ? raw : "";

  if (!result.success) {
    return { identifier: typed, errors: z.flattenError(result.error).fieldErrors };
  }
  const { identifier: id, password } = result.data;

  // Calling auth.api directly skips Better Auth's own rate limiter (that one only guards the
  // /api/auth HTTP routes), so the form limits tries itself. Per account — the same 5 tries
  // whether you type the email or the username — not per IP: it stops password guessing even
  // from many addresses, at the cost that someone who knows a login can keep it locked by
  // guessing. Fine for a family shop; the owner can still wait it out.
  const account = await db.user.findFirst({ where: id.by === "email" ? { email: id.email } : { username: id.username }, select: { id: true } });
  const key = account ? `user:${account.id}` : `${id.by}:${id.by === "email" ? id.email : id.username}`;
  const now = new Date();
  await db.loginAttempt.deleteMany({ where: { key, lastFailure: { lt: new Date(now.getTime() - LOGIN_WINDOW_MS) } } });
  // Counted before the password is checked, in one atomic upsert, so parallel requests
  // can't all read "4 tries" and slip past the limit together.
  const tries = await db.loginAttempt.upsert({
    where: { key },
    create: { key, attempts: 1, lastFailure: now },
    update: { attempts: { increment: 1 } },
  });
  const wait = lockedForMinutes({ attempts: tries.attempts, lastFailure: tries.lastFailure.getTime() }, now.getTime());
  if (wait) return { identifier: typed, error: `Too many wrong passwords. Try again in ${wait} minute${wait === 1 ? "" : "s"}.` };

  try {
    // Checks the password hash and sets the session cookie (via the nextCookies plugin).
    const request = { headers: await headers() };
    if (id.by === "email") await auth.api.signInEmail({ body: { email: id.email, password }, ...request });
    else await auth.api.signInUsername({ body: { username: id.username, password }, ...request });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    if (error.body?.code === ACCOUNT_DEACTIVATED) return { identifier: typed, error: error.body.message };
    if (error.status !== "UNAUTHORIZED") {
      // Not their mistake (rate limited, server trouble), so it doesn't count as a try.
      await db.loginAttempt.update({ where: { key }, data: { attempts: { decrement: 1 } } });
      return { identifier: typed, error: "Couldn't sign in right now. Try again in a moment." };
    }
    await db.loginAttempt.update({ where: { key }, data: { lastFailure: now } });
    // One message for every wrong detail, so it doesn't reveal which accounts exist.
    return { identifier: typed, error: "Wrong email, username or password." };
  }

  await db.loginAttempt.deleteMany({ where: { key } });
  redirect("/dashboard");
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

/** The signed-in person changes their own password; their other devices are signed out. */
export async function changePassword(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const result = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!result.success) return { errors: z.flattenError(result.error).fieldErrors };

  try {
    // Needs the session cookie, and checks the current password before changing anything.
    await auth.api.changePassword({
      body: { currentPassword: result.data.currentPassword, newPassword: result.data.newPassword, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    if (error.body?.code === "INVALID_PASSWORD") return { errors: { currentPassword: ["That isn't your current password"] } };
    if (error.status === "UNAUTHORIZED") redirect("/login");
    return { error: "Couldn't change the password right now. Try again in a moment." };
  }
  return { ok: true };
}
