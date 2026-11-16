import { z } from "zod";

import { passwordSchema, usernameSchema } from "@/features/users/schemas";

const NOT_AN_IDENTIFIER = "Enter your email or username";

/**
 * One box for either: anything with an "@" is an email, anything else a username.
 * Both come out lowercase, the way Better Auth looks them up.
 */
const identifierSchema = z
  .string({ error: NOT_AN_IDENTIFIER })
  .trim()
  .toLowerCase()
  .pipe(
    z.union(
      [
        z.email().transform((email) => ({ by: "email" as const, email })),
        usernameSchema.transform((username) => ({ by: "username" as const, username })),
      ],
      { error: NOT_AN_IDENTIFIER },
    ),
  );

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string({ error: "Enter your password" }).min(1, { error: "Enter your password" }),
});

export type LoginFormState = {
  identifier?: string;
  /** Wrong credentials, a lock or a deactivated account: not tied to one field. */
  error?: string;
  errors?: { identifier?: string[]; password?: string[] };
};

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Enter your current password" }),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.confirmPassword === v.newPassword, { path: ["confirmPassword"], error: "The passwords don't match" })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], error: "Pick a password you aren't using now" });

export type ChangePasswordState = {
  ok?: boolean;
  error?: string;
  errors?: { currentPassword?: string[]; newPassword?: string[]; confirmPassword?: string[] };
};
