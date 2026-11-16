import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

/** Error code for a deactivated account, so the login form can say so instead of "wrong password". */
export const ACCOUNT_DEACTIVATED = "ACCOUNT_DEACTIVATED";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  // Other addresses the app is opened from, e.g. a POS tablet using the laptop's LAN address.
  trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map((o) => o.trim()),
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // A family shop: nobody signs themselves up. The owner comes from the seed and the
    // owner adds everyone else on the Users page.
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      // input: false — never accepted from a request, so nobody can make themselves an admin.
      role: { type: "string", defaultValue: "Family member", input: false },
      active: { type: "boolean", defaultValue: true, input: false },
    },
  },
  // Covers the /api/auth HTTP routes only; the login form has its own limit (features/auth/actions.ts).
  // In the database so counts survive restarts and are shared between server instances.
  rateLimit: {
    enabled: true,
    storage: "database",
    // Read-only and asked on every /login visit by src/proxy.ts: counting it would write a row per page view.
    customRules: { "/get-session": false },
  },
  databaseHooks: {
    session: {
      create: {
        // The one place every sign-in passes (the form and the raw /api/auth route alike).
        before: async (session) => {
          const user = await db.user.findUnique({ where: { id: session.userId }, select: { active: true } });
          if (!user?.active) {
            throw new APIError("FORBIDDEN", { message: "This account is deactivated. Ask the shop owner.", code: ACCOUNT_DEACTIVATED });
          }
        },
      },
    },
  },
  plugins: [
    // Sign in with a username as well as an email. Defaults: 3-30 letters, numbers, _ and .,
    // matched ignoring capitals (features/users/schemas.ts uses the same rules).
    username(),
    // Lets server actions (sign in / sign out) set the session cookie. Must stay last.
    nextCookies(),
  ],
});
