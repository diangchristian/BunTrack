"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { loginSchema, type LoginFormState } from "./schemas";

export async function login(_prev: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const email = formData.get("email");
  const result = loginSchema.safeParse({ email, password: formData.get("password") });

  if (!result.success) {
    return {
      email: typeof email === "string" ? email : "",
      errors: z.flattenError(result.error).fieldErrors,
    };
  }

  // shortcut: credentials are not checked and no session is created yet, so anyone
  // who passes validation gets in. Replace with Better Auth before real data exists.
  redirect("/dashboard");
}
