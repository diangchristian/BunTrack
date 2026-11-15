import type { ProductFormValues } from "./schemas";
import type { Product } from "./types";

/** Ice cream is resold from Dan Eric and counted by unit; everything else is made in-house. */
const isCountedByUnit = (category: Product["category"]) => category === "iceCream";

export function createProductStore(seed: Product[]) {
  let products = seed.map((p) => ({ ...p }));

  return {
    list: () => products,

    create(values: ProductFormValues): Product {
      const product: Product = { id: crypto.randomUUID(), ...values, stock: isCountedByUnit(values.category) ? 0 : null };
      products = [...products, product];
      return product;
    },

    update(id: string, values: ProductFormValues): Product | undefined {
      const existing = products.find((p) => p.id === id);
      if (!existing) return undefined;
      // A product marked available again is back in stock, so its old reason no longer applies.
      const updated: Product = {
        ...existing,
        ...values,
        stock: isCountedByUnit(values.category) ? (existing.stock ?? 0) : null,
        unavailableReason: values.available ? undefined : existing.unavailableReason,
      };
      products = products.map((p) => (p.id === id ? updated : p));
      return updated;
    },

    /** Deducts sold units. All-or-nothing: if any counted item is short, nothing changes. */
    sell(lines: { productId: string; quantity: number }[]) {
      const short = lines.some(({ productId, quantity }) => {
        const stock = products.find((p) => p.id === productId)?.stock;
        return stock != null && stock < quantity;
      });
      if (short) return false;
      products = products.map((p) => {
        const sold = lines.filter((l) => l.productId === p.id).reduce((sum, l) => sum + l.quantity, 0);
        return p.stock != null && sold ? { ...p, stock: p.stock - sold } : p;
      });
      return true;
    },

    archive(id: string) {
      const before = products.length;
      products = products.filter((p) => p.id !== id);
      return products.length < before;
    },
  };
}

// shortcut: products live in server memory, so edits reset when the server restarts.
// Replace this store with Prisma queries in queries.ts / actions.ts once the database exists.
const sampleProducts: Product[] = [
  { id: "classic-cheeseburger", name: "Classic Cheeseburger", description: "Beef patty, cheese, lettuce, tomato", category: "burgers", price: 14900, cost: 5840, stock: null, available: true },
  { id: "double-cheeseburger", name: "Double Cheeseburger", description: "Two beef patties, double cheese", category: "burgers", price: 21900, cost: 9680, stock: null, available: true },
  { id: "bacon-burger", name: "Bacon Burger", description: "Beef patty, crispy bacon, cheese", category: "burgers", price: 19900, cost: 8450, stock: null, available: true },
  { id: "chicken-burger", name: "Chicken Burger", description: "Crispy chicken patty, mayo, lettuce", category: "burgers", price: 16900, cost: 6620, stock: null, available: true },
  { id: "classic-combo", name: "Classic Combo", description: "Classic Cheeseburger + fries + drink", category: "combos", price: 20900, cost: 8890, stock: null, available: true },
  { id: "bacon-burger-combo", name: "Bacon Burger Combo", description: "Bacon Burger + fries + drink", category: "combos", price: 25900, cost: 11500, stock: null, available: true },
  { id: "french-fries", name: "French Fries", description: "Regular, salted", category: "sides", price: 7900, cost: 2260, stock: null, available: true },
  { id: "cheesy-fries", name: "Cheesy Fries", description: "Fries with cheese sauce", category: "sides", price: 9900, cost: 3150, stock: null, available: true },
  { id: "onion-rings", name: "Onion Rings", description: "Beer-battered, 8 pcs", category: "sides", price: 8900, cost: 2730, stock: null, available: false, unavailableReason: "Out of onions" },
  { id: "iced-tea", name: "Iced Tea", description: "House-brewed, 16 oz", category: "drinks", price: 5900, cost: 1240, stock: null, available: true },
  { id: "soft-drinks", name: "Soft Drinks", description: "Cola / Lemon-lime, 16 oz", category: "drinks", price: 5500, cost: 2400, stock: null, available: true },
  // Dan Eric ice cream ("Updated List" prices; cost = dealer net price; stock = Inventory Tracker, Nov 13 2026)
  { id: "ice-buko", name: "Ice Buko", description: "Dan Eric", category: "iceCream", price: 1500, cost: 1130, stock: 0, available: true },
  { id: "ice-cone", name: "Ice Cone", description: "Dan Eric", category: "iceCream", price: 3500, cost: 2763, stock: 0, available: true },
  { id: "small-cup", name: "Small Cup", description: "Dan Eric", category: "iceCream", price: 1900, cost: 1467, stock: 0, available: true },
  { id: "medium-cup", name: "Medium Cup", description: "Dan Eric", category: "iceCream", price: 2900, cost: 2186, stock: 0, available: true },
  { id: "big-cup", name: "Big Cup", description: "Dan Eric", category: "iceCream", price: 3500, cost: 2720, stock: 0, available: true },
  { id: "pint", name: "Pint", description: "Dan Eric", category: "iceCream", price: 9200, cost: 7600, stock: 13, available: true },
  { id: "one-liter", name: "1 Liter", description: "Dan Eric", category: "iceCream", price: 18700, cost: 14600, stock: 0, available: true },
  { id: "half-gallon", name: "Half Gallon", description: "Dan Eric", category: "iceCream", price: 31500, cost: 25200, stock: 3, available: true },
  { id: "three-six-liter", name: "3.6 Liter", description: "Dan Eric", category: "iceCream", price: 58500, cost: 47600, stock: 3, available: true },
];

// Kept on globalThis so dev hot-reloads don't wipe edits (same trick as lib/db.ts).
const globalForStore = globalThis as unknown as { productStore?: ReturnType<typeof createProductStore> };
export const productStore = (globalForStore.productStore ??= createProductStore(sampleProducts));
