# BunTrack database schema

The tables in `prisma/schema.prisma`, how they connect, and what happens to related rows on delete.

**Status:** the sign-in tables (User, Session, Account, Verification, RateLimit, LoginAttempt) are live on Neon. The 10 app tables are a **draft, not migrated yet**.

- 16 tables (10 new for the app, 6 for sign-in) and 4 enums
- Money is whole **centavos** (₱149.00 = `14900`); stock quantities are the item's **small unit** (pc, g, ml)

> Preview this file in VS Code with `Ctrl+Shift+V` (Mermaid diagrams render in the preview) or on GitHub.

## How the tables connect

Read each line from the "one" side to the "many" side: one category has many products.

- `||--o{` one to zero-or-more
- `||--|{` one to one-or-more
- `|o--o{` optional one to zero-or-more

```mermaid
erDiagram
  User ||--o{ Session : "signed in on"
  User ||--o{ Account : "signs in with"
  User ||--o{ Order : "rang up"
  User ||--o{ StockMovement : "recorded"
  User ||--o{ Expense : "recorded"
  User ||--o{ ActivityEntry : "did"
  Category ||--o{ Product : "groups"
  Product ||--o{ RecipeLine : "is made from"
  InventoryItem ||--o{ RecipeLine : "is used in"
  InventoryItem ||--o{ StockMovement : "changes by"
  Order ||--|{ OrderLine : "contains"
  Product ||--o{ OrderLine : "sold as"
  Order |o--o{ StockMovement : "deducted stock"
```

Not linked to anything: `Settings` (one row), `Verification` (Better Auth), `RateLimit` (Better Auth's request counters), `LoginAttempt` (the login form's lock).

## Every column

`PK` primary key, `FK` points at another table, `UK` unique. Quoted notes mark optional columns or units.

```mermaid
erDiagram
  User {
    string id PK
    string name
    string email UK
    string username UK "optional, lowercase"
    string displayUsername "optional, as typed"
    string role "Administrator or Family member"
    boolean active
    boolean emailVerified
    string image "optional"
    datetime createdAt
    datetime updatedAt
  }
  Session {
    string id PK
    string token UK
    string userId FK
    datetime expiresAt
    string ipAddress "optional"
    string userAgent "optional"
  }
  Account {
    string id PK
    string userId FK
    string providerId "credential"
    string accountId "the user's id"
    string password "hash, optional"
  }
  Category {
    string id PK "slug, e.g. iceCream"
    string label
    int position "menu order"
  }
  Product {
    string id PK
    string name
    string description
    string categoryId FK
    int price "centavos per order"
    int pieces "1, or 2 for B1T1"
    string image "optional data URL"
    boolean available
    datetime archivedAt "optional"
  }
  InventoryItem {
    string id PK
    string name
    string category "Produce, Frozen, ..."
    Unit unit "pcs, kg or L"
    int quantity "on hand"
    int minimum "reorder point"
    int unitCost "centavos per kg, L or pc"
    int packSize "optional"
    boolean homemade
    datetime archivedAt "optional"
  }
  RecipeLine {
    string productId PK, FK
    string itemId PK, FK
    int quantity "per piece"
  }
  StockMovement {
    string id PK
    string itemId FK
    MovementType type
    int change "signed, +5000 or -15"
    int unitCost "optional, Stock In"
    string reference "optional, receipt no."
    string supplier "optional"
    string note "optional"
    string orderId FK "optional, sales"
    date date
    string recordedById FK
    datetime createdAt
  }
  Order {
    string id PK
    int number UK "shown as #1001"
    datetime completedAt
    date date "Manila day"
    string cashierId FK
    PaymentMethod method
    int amountReceived "centavos"
  }
  OrderLine {
    string id PK
    string orderId FK
    string productId FK
    string name "snapshot"
    string categoryId "snapshot"
    int quantity
    int unitPrice "snapshot, centavos"
    int unitCost "snapshot, centavos"
  }
  Expense {
    string id PK
    date date
    string category "Electricity, LPG, ..."
    ExpenseBusiness business
    string description
    int amount "centavos"
    PaymentMethod paidVia
    string recordedById FK
  }
  ActivityEntry {
    string id PK
    datetime at
    string userId FK
    string module "POS, Inventory, ..."
    string action
    string record
    string change "optional"
  }
  Settings {
    int id PK "always 1"
    string shopName
    string contactNumber
    string address
    string receiptFooter
  }
  User ||--o{ Session : ""
  User ||--o{ Account : ""
  User ||--o{ Order : ""
  User ||--o{ StockMovement : ""
  User ||--o{ Expense : ""
  User ||--o{ ActivityEntry : ""
  Category ||--o{ Product : ""
  Product ||--o{ RecipeLine : ""
  InventoryItem ||--o{ RecipeLine : ""
  InventoryItem ||--o{ StockMovement : ""
  Order ||--|{ OrderLine : ""
  Product ||--o{ OrderLine : ""
  Order |o--o{ StockMovement : ""
```

## Relationships and delete rules

**Cascade** deletes the related rows too. **Restrict** refuses the delete while related rows exist, which protects history. The app archives products and items and deactivates people, so these rules are a safety net.

| One | Many | Through | If the "one" is deleted | Why |
|---|---|---|---|---|
| User | Session | `userId` | Cascade | A removed account's sign-ins go with it. |
| User | Account | `userId` | Cascade | The password hash belongs to the person. |
| User | Order | `cashierId` | Restrict | Past sales keep their cashier. Deactivate people instead. |
| User | StockMovement | `recordedById` | Restrict | The stock history says who moved what. |
| User | Expense | `recordedById` | Restrict | Same, for expenses. |
| User | ActivityEntry | `userId` | Restrict | The log can't lose its "who". |
| Category | Product | `categoryId` | Restrict | A category in use can't be deleted (Settings already blocks it). |
| Product | RecipeLine | `productId` | Cascade | A recipe means nothing without its product. |
| InventoryItem | RecipeLine | `itemId` | Restrict | An ingredient can't vanish from a recipe that uses it. |
| InventoryItem | StockMovement | `itemId` | Restrict | The ledger stays complete; archive the item instead. |
| Order | OrderLine | `orderId` | Cascade | Lines are part of the order (orders are never deleted in the app). |
| Product | OrderLine | `productId` | Restrict | Sold products are archived, so receipts and reports stay correct. |
| Order | StockMovement | `orderId` (optional) | Restrict | Only sales have an order; Stock In, waste and adjustments leave it empty. |

## Decisions to check

| Decision | Example | Why |
|---|---|---|
| Money is whole centavos | ₱149.00 → `14900` | Totals never pick up rounding errors. |
| Stock in small units | 2.5 kg onions → `quantity 2500, unit kg` | Repeated small deductions (15 g of lettuce) never drift. |
| Order lines are snapshots | `unitPrice 16900 · unitCost 7420` | Editing a product later never rewrites past revenue or profit. |
| Stock is a ledger | `+5000` Stock In · `-15` sale #1043 | Every change is a row that's never edited; `quantity` is the running total, updated in the same transaction. |
| Archive, don't delete | `archivedAt` set → hidden from menus | Orders, recipes and the ledger point at products and items. |
| "Who" links to the account | `cashierId` → `User.name` | A renamed family member shows their current name everywhere. |
| Order numbers from 1001 | `#1001`, `#1002`, … | A database sequence, so two tills can't take the same number. |
| Some lists stay text | category `"Ice Cream (Dan Eric)"` | Names with spaces and slashes can't be enum values; the app checks them with zod. |

## Enums

| Enum | Values |
|---|---|
| `Unit` | `pcs`, `kg`, `L` |
| `MovementType` | `stock-in`, `adjustment`, `waste`, `sale` |
| `PaymentMethod` | `cash`, `gcash` |
| `ExpenseBusiness` | `burger`, `iceCream`, `shared` |
