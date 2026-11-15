import "server-only";

// shortcut: there are no sessions yet, so everyone is the sample admin.
// Read the user from the Better Auth session once login is real.
export async function getCurrentUser() {
  return { firstName: "Maria", name: "Maria Reyes", role: "Administrator" };
}

/** Cashiers sell; only the owner/manager changes the menu, prices, recipes and stock records. */
export async function canManageStore() {
  const user = await getCurrentUser();
  return user.role === "Administrator" || user.role === "Manager";
}
