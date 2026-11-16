import { z } from "zod";

import { roles, type Role } from "./types";

const roleIds = roles.map((r) => r.id) as [Role, ...Role[]];

/** Better Auth's default length limits for email + password accounts. */
export const passwordSchema = z
  .string()
  .min(8, { error: "Use at least 8 characters" })
  .max(128, { error: "Keep the password under 128 characters" });

/** Better Auth's username plugin defaults: 3-30 characters, letters, numbers, _ and . */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, { error: "Use at least 3 characters" })
  .max(30, { error: "Keep the username under 30 characters" })
  .regex(/^[a-zA-Z0-9_.]+$/, { error: "Use only letters, numbers, _ and ." });

/** Editing: a blank password keeps the current one. */
export const userFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Enter their name" }).max(60, { error: "Keep the name under 60 characters" }),
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email address" })),
  role: z.enum(roleIds, { error: "Pick a role" }),
  password: z.union([z.literal(""), passwordSchema]),
  // Optional: a shorter way to sign in. Kept as typed for display; stored lowercase for sign-in.
  username: z.union([z.literal(""), usernameSchema]),
});

/** Adding: they need a password to sign in. */
export const newUserSchema = userFormSchema.extend({ password: passwordSchema });

export type UserFormValues = z.infer<typeof userFormSchema>;

/** The role stored on an account. Anything unexpected gets the least access, never admin. */
export const parseRole = (value: unknown): Role => z.enum(roleIds).catch("Family member").parse(value);
