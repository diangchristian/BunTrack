import "server-only";

// shortcut: there are no sessions yet, so everyone is the sample admin.
// Read the user from the Better Auth session once login is real.
export async function getCurrentUser() {
  return { firstName: "Maria", name: "Maria Reyes", role: "Administrator" };
}
