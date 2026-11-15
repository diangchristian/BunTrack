import type { Settings } from "./schemas";

// shortcut: settings live in server memory and reset when the server restarts. Replace with a
// single-row settings table once the database exists.
const defaults: Settings = {
  shopName: "Bun & Patty Burger House",
  contactNumber: "",
  address: "",
  receiptFooter: "Salamat! Come back for more burgers.",
};

const globalForStore = globalThis as unknown as { settings?: Settings };
globalForStore.settings ??= defaults;

export const settingsStore = {
  get: () => globalForStore.settings!,
  set: (next: Settings) => {
    globalForStore.settings = next;
  },
};
