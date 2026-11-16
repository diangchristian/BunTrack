import { z } from "zod";

import { passwordSchema } from "@/features/users/schemas";

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address" }),
  password: z.string().min(1, { error: "Enter your password" }),
});

export type LoginFormState = {
  email?: string;
  /** Wrong credentials, a lock or a deactivated account: not tied to one field. */
  error?: string;
  errors?: { email?: string[]; password?: string[] };
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
