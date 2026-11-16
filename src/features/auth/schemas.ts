import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address" }),
  password: z.string().min(1, { error: "Enter your password" }),
});

export type LoginFormState = {
  email?: string;
  /** Wrong credentials or a deactivated account: not tied to one field. */
  error?: string;
  errors?: { email?: string[]; password?: string[] };
};
