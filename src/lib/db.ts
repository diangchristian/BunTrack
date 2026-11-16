import "server-only";

import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

const createPrismaClient = () =>
  new PrismaClient({
    // Neon serverless driver (WebSockets) on the pooled DATABASE_URL, as Neon recommends for Prisma.
    adapter: new PrismaNeon({ connectionString: env.DATABASE_URL }),
  });

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
