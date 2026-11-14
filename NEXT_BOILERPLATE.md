# Task: Scaffold a Next.js project boilerplate

You are setting up a clean, production-ready Next.js boilerplate. Create ONLY the
project skeleton described below. Do NOT create any example features, route groups,
pages (other than the root page), auth, or sample data. The goal is an empty but
well-organized foundation that features will be added to later.

## Tech stack

- Next.js (latest stable), App Router, TypeScript, `src/` directory
- Tailwind CSS
- ESLint
- PostgreSQL with Prisma v7.10.0
- Zod for validation
- `@t3-oss/env-nextjs` for type-safe environment variables

## Step 1: Scaffold

Run create-next-app non-interactively in the current directory:

npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/\*"

After it finishes, check the installed Next.js version in package.json. You will
need it in Step 4 (middleware vs proxy file name).

## Step 2: Install dependencies

- Runtime: zod, server-only, @t3-oss/env-nextjs, @prisma/client, clsx, tailwind-merge
- Dev: prisma

Then run `npx prisma init --datasource-provider postgresql`. Follow whatever
structure the installed Prisma version generates (config file location, client
output path, driver adapter requirements). Do not force an older Prisma setup
pattern if the current version does it differently.

##  

Produce exactly this structure. Use a `.gitkeep` file to keep empty folders in git.

```
.
├── prisma/
│   ├── schema.prisma        # Postgres datasource + generator, NO models yet
│   └── seed.ts              # Empty seed script with a TODO comment
├── public/                  # Keep create-next-app defaults
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout: html, body, font, metadata
│   │   ├── page.tsx         # Minimal placeholder home page
│   │   ├── globals.css      # Tailwind import + CSS variables
│   │   ├── not-found.tsx    # Simple global 404 page
│   │   └── global-error.tsx # Last-resort error boundary ("use client")
│   ├── features/
│   │   └── README.md        # Documents the feature folder convention (see below)
│   ├── components/
│   │   ├── ui/.gitkeep      # Shared primitives (Button, Input...) go here later
│   │   └── layout/.gitkeep  # Navbar, Sidebar, Footer go here later
│   ├── hooks/.gitkeep       # Shared client-side hooks
│   ├── lib/
│   │   ├── db.ts            # Prisma client singleton
│   │   ├── env.ts           # Validated environment variables
│   │   └── utils.ts         # cn() helper
│   └── middleware.ts        # OR proxy.ts, see Step 4
├── .env                     # Local values, gitignored
├── .env.example             # Variable names only, committed
├── .gitignore
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

Delete any create-next-app demo content (sample SVGs in the page, demo styles)
so the starting point is clean.

## Step 4: File requirements

**src/lib/db.ts**

- Start with `import "server-only";`
- Export a single Prisma client instance using the globalThis singleton pattern
  so hot reload in development does not create multiple connections.

**src/lib/env.ts**

- Use `createEnv` from `@t3-oss/env-nextjs`.
- Server vars: `DATABASE_URL` (url), `NODE_ENV` (enum: development, test,
  production, default development).
- Client vars: none yet, but include the empty `client` object and a comment
  explaining that client vars must be prefixed with `NEXT_PUBLIC_`.
- Follow the library's current docs for the runtimeEnv setup.

**src/lib/utils.ts**

- Export `cn(...inputs)` combining clsx and tailwind-merge.

**src/middleware.ts or src/proxy.ts**

- If the installed Next.js version is 16 or later, name the file `proxy.ts` and
  use the export name that version expects. Otherwise use `middleware.ts`.
- Implement a pass-through that returns `NextResponse.next()`, with a matcher that
  excludes static files, images, and `_next` assets.
- Add a comment: this file is for lightweight redirects only; real authorization
  checks belong in each feature's server-side queries and actions.

**src/app/layout.tsx**

- Load one Google font via `next/font`, set basic metadata (title template and
  description placeholders), import globals.css.

**src/app/page.tsx**

- A server component rendering the project name and one line of text. Nothing else.

**src/app/not-found.tsx and src/app/global-error.tsx**

- Minimal, styled with Tailwind. global-error.tsx must be a client component,
  render its own html and body tags, and offer a "Try again" button calling reset().

**prisma/schema.prisma**

- Postgres datasource using DATABASE_URL, the client generator, and a comment
  saying models are added per feature. No models.

**package.json scripts** (add these alongside the defaults)

- `db:generate`: prisma generate
- `db:migrate`: prisma migrate dev
- `db:studio`: prisma studio
- `db:seed`: runs prisma/seed.ts (use tsx; install it as a dev dependency)
- Add a `postinstall` script that runs prisma generate.

**.env.example**

- `DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DB_NAME"`
- Make sure `.env` is in .gitignore and `.env.example` is not.

**src/features/README.md**
Explain the convention every feature must follow:

```
features/<feature-name>/
  components/   # UI for this feature. Server components by default;
                # add "use client" only to small interactive pieces
  actions.ts    # "use server". Mutations. Always check auth and
                # validate input with Zod. Treat each as a public endpoint
  queries.ts    # import "server-only". Data reads, including auth checks
  schemas.ts    # Zod schemas
  types.ts      # Feature-specific TypeScript types
  service.ts    # Optional. Complex business logic shared by actions and queries
```

Also state these rules:

- Files in `src/app/` only handle routing and composition. Keep pages thin
  and import logic from features.
- Push "use client" as far down the component tree as possible.
- Anything used by only one route may be colocated in that route under a
  `_components/` private folder; move it to features/ once it is shared.

**README.md** (project root)
Include: prerequisites, setup steps (install, copy .env.example to .env,
run migrations, start dev server), the scripts list, and a short "Project
structure" section summarizing the folders above and linking to
src/features/README.md.

## Step 5: Verify

1. Run `npm run lint` and fix any errors.
2. Run `npx tsc --noEmit` and fix any type errors.
3. Run `npm run build`. It must succeed. If the build fails only because no
   database is reachable, make sure nothing queries the database at build time
   rather than weakening the env validation.
4. Print the final tree (excluding node_modules and .next).

## Constraints

- Do not add example features, route groups, auth, UI libraries, state
  management, or testing frameworks.
- Do not add placeholder components beyond what is listed.
- Do not commit real secrets.
- If any instruction conflicts with the installed version of a tool, follow
  the tool's current behavior and tell me what you changed and why.

When finished, give me a short summary of what was created and any deviations
from these instructions.
