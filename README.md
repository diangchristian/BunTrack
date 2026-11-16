# BunTrack

Burger shop management system built with Next.js (App Router), TypeScript,
Tailwind CSS, shadcn/ui (Base UI), PostgreSQL (Neon) and Prisma.

## Prerequisites

- Node.js 20.9 or later
- npm
- The Neon CLI (`npm i -g neon`), signed in with `neon login`

## Setup

```bash
npm install                 # also runs prisma generate
cp .env.example .env        # then set BETTER_AUTH_SECRET and SEED_ADMIN_PASSWORD
neon env pull               # Neon DATABASE_URL (pooled) + DATABASE_URL_UNPOOLED (direct)
npx prisma migrate deploy   # apply migrations (npm run db:migrate to create new ones)
npm run db:seed             # create the first administrator from SEED_ADMIN_*
npm run dev                 # http://localhost:3000, sign in as SEED_ADMIN_EMAIL
```

Sign-in is Better Auth with email and password (`src/lib/auth.ts`). Public sign-up is
off: the seeded administrator adds everyone else on **Users & Roles** and sets their
first password. Anyone can change their own password from the key icon in the sidebar.
The login form allows 5 tries per email, then locks that email for 15 minutes.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run `*.test.ts` files with Node's test runner (via tsx) |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Create and apply migrations (`prisma migrate dev`) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Run `prisma/seed.ts` |

## Project structure

```
prisma/              schema.prisma (auth + login-limit tables), migrations/, seed.ts (first admin)
prisma7.config.ts    Prisma 7 config: schema path, migrations, DATABASE_URL_UNPOOLED
neon.ts              Neon project policy (services, branch TTLs); `neon deploy` applies it
src/app/             Routing and composition only
  login/             Sign-in page
  (app)/             Signed-in shell (sidebar + top bar); dashboard/
src/features/        One folder per feature, see src/features/README.md
src/components/ui/   shadcn components (add more with `npx shadcn@latest add <name>`)
src/components/layout/  App sidebar, top bar, logo
src/hooks/           Shared client-side hooks
src/lib/             auth.ts (Better Auth), db.ts (Prisma client on the Neon driver), env.ts (validated env), utils.ts (cn), format.ts (₱)
src/proxy.ts         Auth redirects (Next.js 16 replacement for middleware): no session cookie → /login;
                     signed in → /login sends you to /dashboard. Pages still check the real session.
src/generated/prisma Generated Prisma client (gitignored)
```

Feature conventions: [src/features/README.md](src/features/README.md).
