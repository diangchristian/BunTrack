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

    update(id: string, values: Partial<ProductFormValues>): Product | undefined {
      const existing = products.find((p) => p.id === id);
      if (!existing) return undefined;
      const updated: Product = { ...existing, ...values };
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
  { id: "classic-cheeseburger", name: "Classic Cheeseburger", description: "Beef patty, cheese, lettuce, tomato", category: "burgers", price: 14900, available: true },
  { id: "double-cheeseburger", name: "Double Cheeseburger", description: "Two beef patties, double cheese", category: "burgers", price: 21900, available: true },
  { id: "bacon-burger", name: "Bacon Burger", description: "Beef patty, crispy bacon, cheese", category: "burgers", price: 19900, available: true },
  { id: "chicken-burger", name: "Chicken Burger", description: "Crispy chicken patty, mayo, lettuce", category: "burgers", price: 16900, available: true },
  { id: "classic-combo", name: "Classic Combo", description: "Classic Cheeseburger + fries + drink", category: "combos", price: 20900, available: true },
  { id: "bacon-burger-combo", name: "Bacon Burger Combo", description: "Bacon Burger + fries + drink", category: "combos", price: 25900, available: true },
  { id: "french-fries", name: "French Fries", description: "Regular, salted", category: "sides", price: 7900, available: true },
  { id: "cheesy-fries", name: "Cheesy Fries", description: "Fries with cheese sauce", category: "sides", price: 9900, available: true },
  { id: "onion-rings", name: "Onion Rings", description: "Beer-battered, 8 pcs", category: "sides", price: 8900, available: true },
  { id: "iced-tea", name: "Iced Tea", description: "House-brewed, 16 oz", category: "drinks", price: 5900, available: true },
  { id: "soft-drinks", name: "Soft Drinks", description: "Cola / Lemon-lime, 16 oz", category: "drinks", price: 5500, available: true },
  // Dan Eric ice cream ("Updated List" prices). Dealer price and stock live in Inventory.
  { id: "ice-buko", name: "Ice Buko", description: "Dan Eric", category: "iceCream", price: 1500, available: true },
  { id: "ice-cone", name: "Ice Cone", description: "Dan Eric", category: "iceCream", price: 3500, available: true },
  { id: "small-cup", name: "Small Cup", description: "Dan Eric", category: "iceCream", price: 1900, available: true },
  { id: "medium-cup", name: "Medium Cup", description: "Dan Eric", category: "iceCream", price: 2900, available: true },
  { id: "big-cup", name: "Big Cup", description: "Dan Eric", category: "iceCream", price: 3500, available: true },
  { id: "pint", name: "Pint", description: "Dan Eric", category: "iceCream", price: 9200, available: true },
  { id: "one-liter", name: "1 Liter", description: "Dan Eric", category: "iceCream", price: 18700, available: true },
  { id: "half-gallon", name: "Half Gallon", description: "Dan Eric", category: "iceCream", price: 31500, available: true },
  { id: "three-six-liter", name: "3.6 Liter", description: "Dan Eric", category: "iceCream", price: 58500, available: true },
];

// Kept on globalThis so dev hot-reloads don't wipe edits (same trick as lib/db.ts).
const globalForStore = globalThis as unknown as { productStore?: ReturnType<typeof createProductStore> };
export const productStore = (globalForStore.productStore ??= createProductStore(sampleProducts));
