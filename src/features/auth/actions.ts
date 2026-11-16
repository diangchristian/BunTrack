"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth, DEACTIVATED } from "@/lib/auth";
import { loginSchema, type LoginFormState } from "./schemas";

export async function login(_prev: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const email = formData.get("email");
  const result = loginSchema.safeParse({ email, password: formData.get("password") });
  const typed = typeof email === "string" ? email : "";

  if (!result.success) {
    return { email: typed, errors: z.flattenError(result.error).fieldErrors };
  }

  try {
    // Checks the password hash and sets the session cookie (via the nextCookies plugin).
    // A deactivated account is refused by the session hook in src/lib/auth.ts.
    await auth.api.signInEmail({ body: result.data, headers: await headers() });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    if (error.message === DEACTIVATED) return { email: typed, error: DEACTIVATED };
    // Same message for a wrong email or a wrong password, so it doesn't reveal which accounts exist.
    return { email: typed, error: "Wrong email or password." };
  }

  redirect("/dashboard");
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
