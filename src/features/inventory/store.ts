import { seedSampleCatalog } from "@/lib/sample-data";
import { formatQuantity } from "./costing";
import type { InventoryItem, MovementType, RecipeLine, StockMovement } from "./types";

export type MovementInput = {
  type: Exclude<MovementType, "sale">;
  itemId: string;
  /** Small unit. Stock In: amount received. Adjustment: amount counted. Waste: amount thrown away. */
  quantity: number;
  unitCost?: number;
  reference?: string;
  supplier?: string;
  note?: string;
  date: string;
};

type Result = { ok: true } | { ok: false; error: string };

export function createInventoryStore(seed: { items: InventoryItem[]; recipes: Record<string, RecipeLine[]> }) {
  let items = seed.items.map((i) => ({ ...i }));
  let recipes = { ...seed.recipes };
  let movements: StockMovement[] = []; // newest first

  const log = (entries: Omit<StockMovement, "id" | "createdAt">[]) => {
    const createdAt = new Date().toISOString();
    movements = [...entries.map((e) => ({ ...e, id: crypto.randomUUID(), createdAt })), ...movements];
  };
  const setQuantity = (id: string, quantity: number, unitCost?: number) => {
    items = items.map((i) => (i.id === id ? { ...i, quantity, unitCost: unitCost ?? i.unitCost } : i));
  };

  return {
    items: () => items,
    movements: () => movements,
    recipes: () => recipes,
    recipe: (productId: string) => recipes[productId] ?? [],

    setRecipe(productId: string, lines: RecipeLine[]) {
      recipes = { ...recipes, [productId]: lines };
    },

    addItem(values: Omit<InventoryItem, "id">): InventoryItem {
      const item = { id: crypto.randomUUID(), ...values };
      items = [...items, item];
      return item;
    },

    recordMovement(input: MovementInput, by: string): Result {
      const item = items.find((i) => i.id === input.itemId);
      if (!item) return { ok: false, error: "This item no longer exists." };

      let change: number;
      if (input.type === "stock-in") change = input.quantity;
      else if (input.type === "adjustment") change = input.quantity - item.quantity;
      else if (input.quantity > item.quantity) {
        return { ok: false, error: `Only ${formatQuantity(item.quantity, item.unit)} on hand; you can't waste more than that.` };
      }
      else change = -input.quantity;

      // Latest purchase price becomes the unit cost, so every recipe using it is re-costed.
      setQuantity(item.id, item.quantity + change, input.type === "stock-in" ? input.unitCost : undefined);
      const homemadeBatch = input.type === "stock-in" && item.homemade;
      log([
        {
          ...input,
          change,
          unitCost: input.type === "stock-in" ? input.unitCost : undefined,
          supplier: homemadeBatch ? "Made in-house" : input.supplier,
          reference: homemadeBatch ? undefined : input.reference,
          by,
        },
      ]);
      return { ok: true };
    },

    /**
     * Deducts the recipes of sold products, adding up ingredients the products share.
     * All-or-nothing: if any ingredient is short, nothing changes and its name is returned.
     */
    consume(lines: { productId: string; quantity: number }[], reference: string, by: string, date: string): { ok: true } | { ok: false; shortOf: string } {
      const needed = new Map<string, number>();
      for (const line of lines) {
        for (const r of recipes[line.productId] ?? []) {
          needed.set(r.itemId, (needed.get(r.itemId) ?? 0) + r.quantity * line.quantity);
        }
      }
      for (const [itemId, amount] of needed) {
        const item = items.find((i) => i.id === itemId);
        if ((item?.quantity ?? 0) < amount) return { ok: false, shortOf: item?.name ?? "a removed item" };
      }
      for (const [itemId, amount] of needed) {
        setQuantity(itemId, items.find((i) => i.id === itemId)!.quantity - amount);
      }
      log([...needed].map(([itemId, amount]) => ({ type: "sale" as const, itemId, change: -amount, reference, date, by })));
      return { ok: true };
    },
  };
}

export type InventoryStore = ReturnType<typeof createInventoryStore>;

// shortcut: inventory lives in server memory, so stock and movements reset when the server
// restarts. Replace with Prisma (items, recipe_lines, stock_movements tables) once the database exists.
const item = (id: string, name: string, category: InventoryItem["category"], unit: InventoryItem["unit"], quantity: number, minimum: number, unitCost: number): InventoryItem =>
  ({ id, name, category, unit, quantity, minimum, unitCost });

const sampleItems: InventoryItem[] = [
  // Figma Inventory screen (quantities in g / ml / pcs; unit cost per kg / L / pc)
  item("burger-buns", "Burger Buns", "Bakery", "pcs", 35, 50, 850),
  { ...item("beef-patties", "Beef Patties", "Meat", "pcs", 18, 40, 3200), homemade: true },
  { ...item("chicken-patties", "Chicken Patties", "Meat", "pcs", 64, 30, 2600), homemade: true },
  item("bacon-strips", "Bacon Strips", "Meat", "pcs", 40, 20, 1500),
  item("cheese-slices", "Cheese Slices", "Dairy", "pcs", 42, 60, 720),
  item("cheese-sauce", "Cheese Sauce", "Dairy", "L", 2000, 1000, 28000),
  item("lettuce", "Lettuce", "Produce", "kg", 600, 2000, 12000),
  item("tomatoes", "Tomatoes", "Produce", "kg", 4500, 2000, 12000),
  item("onions", "Onions", "Produce", "kg", 0, 3000, 9000),
  item("burger-sauce", "Burger Sauce", "Condiments", "L", 3200, 1000, 20000),
  item("mayonnaise", "Mayonnaise", "Condiments", "L", 2500, 1000, 26000),
  item("french-fries", "French Fries", "Frozen", "kg", 8200, 5000, 18000),
  item("cooking-oil", "Cooking Oil", "Pantry", "L", 12000, 5000, 18000),
  item("iced-tea-mix", "Iced Tea Mix", "Drinks", "kg", 1900, 1000, 16000),
  item("cups-16oz", "Cups (16 oz)", "Drinks", "pcs", 200, 100, 300),
  item("soft-drinks", "Soft Drinks (bottle)", "Drinks", "pcs", 48, 24, 2400),
  // Dan Eric ice cream: resold as-is, so each product's recipe is one unit of itself.
  // Stock and dealer prices from the sheet (Inventory Tracker / "Updated List", Nov 13 2026).
  item("ice-buko", "Ice Buko", "Ice Cream (Dan Eric)", "pcs", 0, 0, 1130),
  item("ice-cone", "Ice Cone", "Ice Cream (Dan Eric)", "pcs", 0, 0, 2763),
  item("small-cup", "Small Cup", "Ice Cream (Dan Eric)", "pcs", 0, 0, 1467),
  item("medium-cup", "Medium Cup", "Ice Cream (Dan Eric)", "pcs", 0, 0, 2186),
  item("big-cup", "Big Cup", "Ice Cream (Dan Eric)", "pcs", 0, 0, 2720),
  item("pint", "Pint", "Ice Cream (Dan Eric)", "pcs", 13, 10, 7600),
  item("one-liter", "1 Liter", "Ice Cream (Dan Eric)", "pcs", 0, 10, 14600),
  item("half-gallon", "Half Gallon", "Ice Cream (Dan Eric)", "pcs", 3, 10, 25200),
  item("three-six-liter", "3.6 Liter", "Ice Cream (Dan Eric)", "pcs", 3, 5, 47600),
];

const r = (itemId: string, quantity: number): RecipeLine => ({ itemId, quantity });
/** Joins recipes (burger + fries + drink), adding up items that appear in more than one. */
const combine = (...parts: RecipeLine[][]) =>
  Object.entries(Object.groupBy(parts.flat(), (l) => l.itemId)).map(([itemId, ls]) => r(itemId, ls!.reduce((n, l) => n + l.quantity, 0)));
const classic = [r("burger-buns", 1), r("beef-patties", 1), r("cheese-slices", 1), r("lettuce", 15), r("tomatoes", 20), r("burger-sauce", 15), r("mayonnaise", 10), r("cooking-oil", 5)];
const bacon = [r("burger-buns", 1), r("beef-patties", 1), r("cheese-slices", 1), r("bacon-strips", 2), r("burger-sauce", 15), r("cooking-oil", 5)];
const fries = [r("french-fries", 120), r("cooking-oil", 5)];
const icedTea = [r("iced-tea-mix", 30), r("cups-16oz", 1)];
const iceCreamIds = ["ice-buko", "ice-cone", "small-cup", "medium-cup", "big-cup", "pint", "one-liter", "half-gallon", "three-six-liter"];

// Keyed by product id (see products/store.ts).
const sampleRecipes: Record<string, RecipeLine[]> = {
  "classic-cheeseburger": classic,
  "double-cheeseburger": [r("burger-buns", 1), r("beef-patties", 2), r("cheese-slices", 2), r("lettuce", 15), r("tomatoes", 20), r("burger-sauce", 20), r("cooking-oil", 8)],
  "bacon-burger": bacon,
  "chicken-burger": [r("burger-buns", 1), r("chicken-patties", 1), r("lettuce", 15), r("mayonnaise", 15), r("cooking-oil", 10)],
  "classic-combo": combine(classic, fries, icedTea),
  "bacon-burger-combo": combine(bacon, fries, icedTea),
  "french-fries": fries,
  "cheesy-fries": combine(fries, [r("cheese-sauce", 30)]),
  "onion-rings": [r("onions", 150), r("cooking-oil", 30)],
  "iced-tea": icedTea,
  "soft-drinks": [r("soft-drinks", 1)],
  ...Object.fromEntries(iceCreamIds.map((id) => [id, [r(id, 1)]])),
};

// Kept on globalThis so dev hot-reloads don't wipe changes (same trick as lib/db.ts).
const globalForStore = globalThis as unknown as { inventoryStore?: InventoryStore };
export const inventoryStore = (globalForStore.inventoryStore ??= createInventoryStore(seedSampleCatalog ? { items: sampleItems, recipes: sampleRecipes } : { items: [], recipes: {} }));
