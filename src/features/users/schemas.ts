import { z } from "zod";

import { roles, type Role } from "./types";

export const userFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Enter their name" }).max(60, { error: "Keep the name under 60 characters" }),
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email address" })),
  role: z.enum(roles.map((r) => r.id) as [Role, ...Role[]], { error: "Pick a role" }),
});

export type UserFormValues = z.infer<typeof userFormSchema>;
