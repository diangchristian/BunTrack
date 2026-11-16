import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const DEACTIVATED = "This account is deactivated. Ask the shop owner.";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // A family shop: nobody signs themselves up. The owner's account comes from the
    // seed, and other accounts are created on the server (the Users page, next).
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      // input: false — never accepted from a request, so nobody can make themselves an admin.
      role: { type: "string", defaultValue: "Family member", input: false },
      active: { type: "boolean", defaultValue: true, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // The one place every sign-in passes (the form and the raw /api/auth route alike).
        before: async (session) => {
          const user = await db.user.findUnique({ where: { id: session.userId }, select: { active: true } });
          if (!user?.active) throw new APIError("FORBIDDEN", { message: DEACTIVATED });
        },
      },
    },
  },
  // Lets server actions (sign in / sign out) set the session cookie. Must stay last.
  plugins: [nextCookies()],
});
