import type { ProductFormValues } from "./schemas";
import type { Product } from "./types";

export function createProductStore(seed: Product[]) {
  let products = seed.map((p) => ({ ...p }));

  return {
    list: () => products,

    create(values: ProductFormValues): Product {
      const product: Product = { id: crypto.randomUUID(), ...values };
      products = [...products, product];
      return product;
    },

    update(id: string, values: ProductFormValues): Product | undefined {
      const existing = products.find((p) => p.id === id);
      if (!existing) return undefined;
      // A product marked available again is back in stock, so its old reason no longer applies.
      const updated: Product = { ...existing, ...values, unavailableReason: values.available ? undefined : existing.unavailableReason };
      products = products.map((p) => (p.id === id ? updated : p));
      return updated;
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
  { id: "classic-cheeseburger", name: "Classic Cheeseburger", description: "Beef patty, cheese, lettuce, tomato", category: "burgers", price: 14900, cost: 5840, available: true },
  { id: "double-cheeseburger", name: "Double Cheeseburger", description: "Two beef patties, double cheese", category: "burgers", price: 21900, cost: 9680, available: true },
  { id: "bacon-burger", name: "Bacon Burger", description: "Beef patty, crispy bacon, cheese", category: "burgers", price: 19900, cost: 8450, available: true },
  { id: "chicken-burger", name: "Chicken Burger", description: "Crispy chicken patty, mayo, lettuce", category: "burgers", price: 16900, cost: 6620, available: true },
  { id: "classic-combo", name: "Classic Combo", description: "Classic Cheeseburger + fries + drink", category: "combos", price: 20900, cost: 8890, available: true },
  { id: "bacon-burger-combo", name: "Bacon Burger Combo", description: "Bacon Burger + fries + drink", category: "combos", price: 25900, cost: 11500, available: true },
  { id: "french-fries", name: "French Fries", description: "Regular, salted", category: "sides", price: 7900, cost: 2260, available: true },
  { id: "cheesy-fries", name: "Cheesy Fries", description: "Fries with cheese sauce", category: "sides", price: 9900, cost: 3150, available: true },
  { id: "onion-rings", name: "Onion Rings", description: "Beer-battered, 8 pcs", category: "sides", price: 8900, cost: 2730, available: false, unavailableReason: "Out of onions" },
  { id: "iced-tea", name: "Iced Tea", description: "House-brewed, 16 oz", category: "drinks", price: 5900, cost: 1240, available: true },
  { id: "soft-drinks", name: "Soft Drinks", description: "Cola / Lemon-lime, 16 oz", category: "drinks", price: 5500, cost: 2400, available: true },
  { id: "chocolate-sundae", name: "Chocolate Sundae", description: "Vanilla soft serve, chocolate syrup", category: "iceCream", price: 6500, cost: 2430, available: true },
  { id: "vanilla-cone", name: "Vanilla Soft Serve Cone", description: "Soft serve on a crispy cone", category: "iceCream", price: 3500, cost: 1480, available: true },
  { id: "ube-sundae", name: "Ube Sundae", description: "Ube soft serve, ube halaya, toppings", category: "iceCream", price: 7500, cost: 3050, available: true },
  { id: "cookies-cream-shake", name: "Cookies & Cream Shake", description: "Vanilla shake, crushed cookies, 16 oz", category: "iceCream", price: 9900, cost: 3860, available: true },
];

// Kept on globalThis so dev hot-reloads don't wipe edits (same trick as lib/db.ts).
const globalForStore = globalThis as unknown as { productStore?: ReturnType<typeof createProductStore> };
export const productStore = (globalForStore.productStore ??= createProductStore(sampleProducts));
