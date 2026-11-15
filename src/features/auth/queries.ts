import "server-only";

import { connection } from "next/server";

import { userStore } from "@/features/users/store";
import type { User } from "@/features/users/types";

// shortcut: there are no sessions yet, so everyone is the first active administrator.
// Read the user from the Better Auth session once login is real.
export async function getCurrentUser(): Promise<User & { firstName: string }> {
  await connection(); // read at request time: accounts can change while the app runs
  const user = userStore.list().find((u) => u.active && u.role === "Administrator")!;
  return { ...user, firstName: user.name.split(" ")[0] };
}

/** Owner and manager: menu, prices, recipes, stock records and expenses. */
export async function canManageStore() {
  const { role } = await getCurrentUser();
  return role === "Administrator" || role === "Manager";
}

/** Owner only: user accounts and settings. */
export async function canAdminister() {
  return (await getCurrentUser()).role === "Administrator";
}
