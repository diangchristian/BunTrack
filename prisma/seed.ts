// Creates the first administrator from SEED_ADMIN_* in .env. Safe to run twice.
// Do not import src/lib/db.ts or src/lib/auth.ts: they are marked server-only and
// throw outside Next.js, so this script makes its own PrismaClient.
import "dotenv/config";

import { randomUUID } from "node:crypto";
import { PrismaNeon } from "@prisma/adapter-neon";
import { hashPassword } from "better-auth/crypto";

import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const { SEED_ADMIN_NAME: name = "Shop Owner", SEED_ADMIN_PASSWORD: password } = process.env;
  // Better Auth looks emails up in lowercase, so a capital letter here would make the account unreachable.
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email || !password || password.length < 8) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (8+ characters) in .env");
  }

  if (await db.user.findUnique({ where: { email } })) {
    console.log(`Admin ${email} already exists, nothing to do.`);
    return;
  }

  // Sign-up is disabled in src/lib/auth.ts, so the account is written directly, in the
  // same shape Better Auth uses: a User, plus a "credential" Account holding the hash.
  const id = randomUUID();
  await db.user.create({
    data: {
      id,
      name,
      email,
      role: "Administrator",
      accounts: { create: { id: randomUUID(), providerId: "credential", accountId: id, password: await hashPassword(password) } },
    },
  });
  console.log(`Created admin ${email}. The password is SEED_ADMIN_PASSWORD in .env.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
