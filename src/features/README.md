# Features

Each feature lives in its own folder and owns its UI, data access and validation.

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
  rules.ts      # Optional. Pure checks/calculations (no database), unit-tested
  summary.ts    #   (same idea: dashboard/summary.ts, sales/report.ts, inventory/movements.ts)
  checkout.ts   # Optional. A "server-only" database write too big for actions.ts
                # (pos/checkout.ts: the sale transaction)
```

Pages and actions check access first (`canUseStore()` / `canAdminister()`).
Shared read helpers named `list…` (`listCategories`, `listOrders`, `listInventoryItems`)
are building blocks for those already-guarded callers, so they don't check again.
A query a page calls as its whole data source (like `getDashboardData`) checks itself.

## Rules

- Files in `src/app/` only handle routing and composition. Keep pages thin and
  import logic from features.
- Push `"use client"` as far down the component tree as possible.
- Anything used by only one route may be colocated in that route under a
  `_components/` private folder. Move it to `features/` once it is shared.
