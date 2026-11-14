# BunTrack

Burger shop management system built with Next.js (App Router), TypeScript,
Tailwind CSS, shadcn/ui (Base UI), PostgreSQL and Prisma.

## Prerequisites

- Node.js 20.9 or later
- npm
- A PostgreSQL database

## Setup

```bash
npm install                 # also runs prisma generate
cp .env.example .env        # then set DATABASE_URL
npm run db:migrate          # apply migrations
npm run dev                 # http://localhost:3000
```

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
prisma/              schema.prisma (no models yet) and seed.ts
prisma7.config.ts    Prisma 7 config: schema path, migrations, DATABASE_URL
src/app/             Routing and composition only
  login/             Sign-in page
  (app)/             Signed-in shell (sidebar + top bar); dashboard/
src/features/        One folder per feature, see src/features/README.md
src/components/ui/   shadcn components (add more with `npx shadcn@latest add <name>`)
src/components/layout/  App sidebar, top bar, logo
src/hooks/           Shared client-side hooks
src/lib/             db.ts (Prisma client), env.ts (validated env), utils.ts (cn), format.ts (₱)
src/proxy.ts         Pass-through request proxy (Next.js 16 replacement for middleware)
src/generated/prisma Generated Prisma client (gitignored)
```

Feature conventions: [src/features/README.md](src/features/README.md).
