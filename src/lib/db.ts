import "server-only";

import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

const createPrismaClient = () =>
  new PrismaClient({
    // Neon serverless driver (WebSockets) on the pooled DATABASE_URL, as Neon recommends for Prisma.
    adapter: new PrismaNeon({ connectionString: env.DATABASE_URL }),
  });

// Reuse one client across hot reloads in development, so each edit doesn't open new connections.
// But not across a `prisma generate` (which `prisma migrate dev` also runs): the regenerated client
// is a new class, and the old instance wouldn't know the new tables or columns. Swapping it here
// is what saves restarting `npm run dev` after a database change.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaClass?: typeof PrismaClient;
};

if (globalForPrisma.prisma && globalForPrisma.prismaClass !== PrismaClient) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaClass = PrismaClient;
}
