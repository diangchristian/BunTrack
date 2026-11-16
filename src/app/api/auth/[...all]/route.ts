import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// Better Auth's HTTP API (/api/auth/sign-in/email, /api/auth/get-session, ...).
export const { GET, POST } = toNextJsHandler(auth);
