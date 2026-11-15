import { ICE_CREAM, type Category } from "./types";

type Result = { ok: true } | { ok: false; error: string };
const LOCKED = "Ice Cream can't be changed: it marks the Dan Eric items.";

export function createCategoryStore(seed: Category[]) {
  let categories = seed.map((c) => ({ ...c })); // in display order (POS buttons, filters)

  const labelTaken = (label: string, exceptId?: string) =>
    categories.some((c) => c.id !== exceptId && c.label.toLowerCase() === label.trim().toLowerCase());

  return {
    list: () => categories,

    add(label: string): { ok: true; category: Category } | { ok: false; error: string } {
      const name = label.trim();
      if (labelTaken(name)) return { ok: false, error: "There's already a category called that." };
      // A readable id from the name ("Rice Meals" → "rice-meals"), made unique if needed.
      const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "category";
      let id = base;
      for (let n = 2; categories.some((c) => c.id === id); n++) id = `${base}-${n}`;
      const category = { id, label: name };
      categories = [...categories, category];
      return { ok: true, category };
    },

    rename(id: string, label: string): Result {
      if (id === ICE_CREAM) return { ok: false, error: LOCKED };
      if (!categories.some((c) => c.id === id)) return { ok: false, error: "This category no longer exists." };
      if (labelTaken(label, id)) return { ok: false, error: "There's already a category called that." };
      categories = categories.map((c) => (c.id === id ? { ...c, label: label.trim() } : c));
      return { ok: true };
    },

    /** Moves one place earlier (-1) or later (1) in the list. */
    move(id: string, direction: -1 | 1): Result {
      const from = categories.findIndex((c) => c.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= categories.length) return { ok: false, error: "It can't move further that way." };
      const next = [...categories];
      [next[from], next[to]] = [next[to], next[from]];
      categories = next;
      return { ok: true };
    },

    /** `productsUsing` comes from the products store: in-use categories can't be deleted. */
    remove(id: string, productsUsing: number): Result {
      if (id === ICE_CREAM) return { ok: false, error: LOCKED };
      if (productsUsing > 0) {
        return { ok: false, error: `${productsUsing} product${productsUsing === 1 ? " uses" : "s use"} this category. Move them to another category first.` };
      }
      const before = categories.length;
      categories = categories.filter((c) => c.id !== id);
      return categories.length < before ? { ok: true } : { ok: false, error: "This category no longer exists." };
    },
  };
}

// shortcut: categories live in server memory and reset when the server restarts. Replace with a
// categories table (with a sort order column) once the database exists.
const defaults: Category[] = [
  { id: "burgers", label: "Burgers" },
  { id: "combos", label: "Combo Meals" },
  { id: "sides", label: "Sides" },
  { id: "drinks", label: "Drinks" },
  { id: ICE_CREAM, label: "Ice Cream" },
];

const globalForStore = globalThis as unknown as { categoryStore?: ReturnType<typeof createCategoryStore> };
export const categoryStore = (globalForStore.categoryStore ??= createCategoryStore(defaults));
