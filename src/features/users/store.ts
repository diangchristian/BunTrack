import type { UserFormValues } from "./schemas";
import type { User } from "./types";

type Result = { ok: true } | { ok: false; error: string };

export function createUserStore(seed: User[]) {
  let users = seed.map((u) => ({ ...u }));

  const emailTaken = (email: string, exceptId?: string) =>
    users.some((u) => u.id !== exceptId && u.email.toLowerCase() === email.toLowerCase());
  /** Would this change leave nobody able to manage users and settings? */
  const losesLastAdmin = (id: string, next: Pick<User, "role" | "active">) =>
    !users.some((u) => u.active && u.role === "Administrator" && u.id !== id) && !(next.active && next.role === "Administrator");

  return {
    list: () => users,

    add(values: UserFormValues): { ok: true; user: User } | { ok: false; error: string } {
      if (emailTaken(values.email)) return { ok: false, error: "Someone already uses that email." };
      const user = { id: crypto.randomUUID(), ...values, active: true };
      users = [...users, user];
      return { ok: true, user };
    },

    update(id: string, values: UserFormValues, actingUserId: string): Result {
      const user = users.find((u) => u.id === id);
      if (!user) return { ok: false, error: "This account no longer exists." };
      if (emailTaken(values.email, id)) return { ok: false, error: "Someone already uses that email." };
      if (losesLastAdmin(id, { role: values.role, active: user.active })) return { ok: false, error: "Keep at least one active administrator." };
      if (id === actingUserId && values.role !== user.role) return { ok: false, error: "You can't change your own role." };
      users = users.map((u) => (u.id === id ? { ...u, ...values } : u));
      return { ok: true };
    },

    setActive(id: string, active: boolean, actingUserId: string): Result {
      const user = users.find((u) => u.id === id);
      if (!user) return { ok: false, error: "This account no longer exists." };
      if (!active && id === actingUserId) return { ok: false, error: "You can't deactivate your own account." };
      if (losesLastAdmin(id, { role: user.role, active })) return { ok: false, error: "Keep at least one active administrator." };
      users = users.map((u) => (u.id === id ? { ...u, active } : u));
      return { ok: true };
    },
  };
}

// shortcut: accounts live in server memory and there are no passwords yet. Move to the
// Better Auth user table once real sign-in exists. Replace these with your family's names.
const sampleUsers: User[] = [
  { id: "maria", name: "Maria Reyes", email: "maria@bunandpatty.ph", role: "Administrator", active: true },
  { id: "carlo", name: "Carlo Mendoza", email: "carlo@bunandpatty.ph", role: "Family member", active: true },
  { id: "ana", name: "Ana Cruz", email: "ana@bunandpatty.ph", role: "Family member", active: true },
];

const globalForStore = globalThis as unknown as { userStore?: ReturnType<typeof createUserStore> };
export const userStore = (globalForStore.userStore ??= createUserStore(sampleUsers));
