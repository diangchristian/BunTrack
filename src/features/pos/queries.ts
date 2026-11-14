import "server-only";

import type { MenuProduct } from "./types";

// shortcut: hard-coded sample menu (Figma POS + ice cream). Replace with a Prisma
// query on products once the Products feature has a table; availability will then
// come from ingredient stock instead of this flag.
const menu: MenuProduct[] = [
  { id: "classic-cheeseburger", name: "Classic Cheeseburger", category: "burgers", price: 14900, available: true },
  { id: "double-cheeseburger", name: "Double Cheeseburger", category: "burgers", price: 21900, available: true },
  { id: "bacon-burger", name: "Bacon Burger", category: "burgers", price: 19900, available: true },
  { id: "chicken-burger", name: "Chicken Burger", category: "burgers", price: 16900, available: true },
  { id: "classic-combo", name: "Classic Combo", category: "combos", price: 20900, available: true },
  { id: "bacon-burger-combo", name: "Bacon Burger Combo", category: "combos", price: 25900, available: true },
  { id: "french-fries", name: "French Fries", category: "sides", price: 7900, available: true },
  { id: "cheesy-fries", name: "Cheesy Fries", category: "sides", price: 9900, available: true },
  { id: "onion-rings", name: "Onion Rings", category: "sides", price: 8900, available: false, unavailableReason: "Out of onions" },
  { id: "iced-tea", name: "Iced Tea", category: "drinks", price: 5900, available: true },
  { id: "soft-drinks", name: "Soft Drinks", category: "drinks", price: 5500, available: true },
  { id: "chocolate-sundae", name: "Chocolate Sundae", category: "iceCream", price: 6500, available: true },
  { id: "vanilla-cone", name: "Vanilla Soft Serve Cone", category: "iceCream", price: 3500, available: true },
  { id: "ube-sundae", name: "Ube Sundae", category: "iceCream", price: 7500, available: true },
  { id: "cookies-cream-shake", name: "Cookies & Cream Shake", category: "iceCream", price: 9900, available: true },
];

export async function getMenu() {
  return menu;
}
