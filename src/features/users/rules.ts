import type { Role, User } from "./types";

// Account rules as plain checks over the current list, so they're the same whatever stores
// the accounts. Each returns the message to show, or null when the change is allowed.

export const EMAIL_TAKEN = "Someone already uses that email.";
export const USERNAME_TAKEN = "Someone already uses that username.";

const emailTaken = (users: User[], email: string, exceptId?: string) =>
  users.some((u) => u.id !== exceptId && u.email.toLowerCase() === email.toLowerCase());

// Sign-in ignores capitals, so "Maria" and "maria" are the same username. Blank means none.
const usernameTaken = (users: User[], username: string, exceptId?: string) =>
  !!username && users.some((u) => u.id !== exceptId && u.username?.toLowerCase() === username.toLowerCase());

/** Would this change leave nobody able to manage users and settings? */
const losesLastAdmin = (users: User[], id: string, next: Pick<User, "role" | "active">) =>
  !users.some((u) => u.active && u.role === "Administrator" && u.id !== id) && !(next.active && next.role === "Administrator");

type Identity = { email: string; username: string };

export function addError(users: User[], values: Identity) {
  if (emailTaken(users, values.email)) return EMAIL_TAKEN;
  return usernameTaken(users, values.username) ? USERNAME_TAKEN : null;
}

export function updateError(users: User[], id: string, values: Identity & { role: Role }, actingUserId: string) {
  const user = users.find((u) => u.id === id);
  if (!user) return "This account no longer exists.";
  if (emailTaken(users, values.email, id)) return EMAIL_TAKEN;
  if (usernameTaken(users, values.username, id)) return USERNAME_TAKEN;
  if (id === actingUserId && values.role !== user.role) return "You can't change your own role.";
  if (losesLastAdmin(users, id, { role: values.role, active: user.active })) return "Keep at least one active administrator.";
  return null;
}

export function setActiveError(users: User[], id: string, active: boolean, actingUserId: string) {
  const user = users.find((u) => u.id === id);
  if (!user) return "This account no longer exists.";
  if (!active && id === actingUserId) return "You can't deactivate your own account.";
  if (losesLastAdmin(users, id, { role: user.role, active })) return "Keep at least one active administrator.";
  return null;
}
