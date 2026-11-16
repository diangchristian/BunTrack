import { ICE_CREAM, type Category } from "./types";

// Category rules as plain checks over the current list, so they're the same whatever stores
// them. Each check returns the message to show, or null when the change is allowed.

type Positioned = Category & { position: number };

const LOCKED = "Ice Cream can't be changed: it marks the Dan Eric items.";
const TAKEN = "There's already a category called that.";

const labelTaken = (label: string, categories: Category[], exceptId?: string) =>
  categories.some((c) => c.id !== exceptId && c.label.toLowerCase() === label.trim().toLowerCase());

/** A readable id from the name ("Rice Meals" → "rice-meals"), made unique if needed. */
export function categoryIdFor(label: string, categories: Category[]) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "category";
  let id = base;
  for (let n = 2; categories.some((c) => c.id === id); n++) id = `${base}-${n}`;
  return id;
}

export function addError(label: string, categories: Category[]) {
  return labelTaken(label, categories) ? TAKEN : null;
}

export function renameError(id: string, label: string, categories: Category[]) {
  if (id === ICE_CREAM) return LOCKED;
  if (!categories.some((c) => c.id === id)) return "This category no longer exists.";
  return labelTaken(label, categories, id) ? TAKEN : null;
}

/**
 * Products using the category, split: active ones can be moved to another category, but archived
 * ones can't be edited and keep their category for their past sales, so it has to stay.
 */
export function removeError(id: string, products: { active: number; archived: number }, categories: Category[]) {
  if (id === ICE_CREAM) return LOCKED;
  if (!categories.some((c) => c.id === id)) return "This category no longer exists.";
  if (products.active > 0) {
    return `${products.active} product${products.active === 1 ? " uses" : "s use"} this category. Move them to another category first.`;
  }
  if (products.archived > 0) {
    return `${products.archived} archived product${products.archived === 1 ? " still belongs" : "s still belong"} to this category, so their past sales keep it. Rename it instead.`;
  }
  return null;
}

/** The two position updates that move a category one place earlier (-1) or later (1); null at either end. */
export function swapWithNeighbour(id: string, direction: -1 | 1, categories: Positioned[]) {
  const sorted = [...categories].sort((a, b) => a.position - b.position);
  const from = sorted.findIndex((c) => c.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= sorted.length) return null;
  return [
    { id: sorted[from].id, position: sorted[to].position },
    { id: sorted[to].id, position: sorted[from].position },
  ];
}
