import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { Role, User } from "@/features/users/types";
import { auth } from "@/lib/auth";

/**
 * The signed-in user, from the Better Auth session cookie. Every page and action goes
 * through here, so no session (or a deactivated account) always ends at /login.
 * cache() runs it once per page render; server actions call it fresh each time.
 */
export const getCurrentUser = cache(async (): Promise<User & { firstName: string }> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !session.user.active) redirect("/login");
  const { id, name, email, role, active } = session.user;
  return { id, name, email, role: role as Role, active, firstName: name.split(" ")[0] };
});

/**
 * Any active account (owner or family member) can use every page except Users & Settings.
 * Kept as a check so actions stay protected once real sign-in exists.
 */
export async function canUseStore() {
  return (await getCurrentUser()).active;
}

/** Owner only: user accounts and settings. */
export async function canAdminister() {
  return (await getCurrentUser()).role === "Administrator";
}
