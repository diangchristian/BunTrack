import assert from "node:assert/strict";
import { test } from "node:test";

import { createCategoryStore } from "./store";

const fresh = () =>
  createCategoryStore([
    { id: "burgers", label: "Burgers" },
    { id: "drinks", label: "Drinks" },
    { id: "iceCream", label: "Ice Cream" },
  ]);

test("add a category: it gets an id from its name and goes last; names must be unique", () => {
  const store = fresh();
  const added = store.add("Rice Meals");
  assert.deepEqual(added, { ok: true, category: { id: "rice-meals", label: "Rice Meals" } });
  assert.deepEqual(store.list().at(-1), { id: "rice-meals", label: "Rice Meals" });
  assert.deepEqual(store.add("  rice meals "), { ok: false, error: "There's already a category called that." });
});

test("rename and reorder; Ice Cream is locked because it marks the Dan Eric items", () => {
  const store = fresh();
  assert.ok(store.rename("drinks", "Beverages").ok);
  assert.ok(store.move("burgers", 1).ok);
  assert.deepEqual(store.list().map((c) => c.label), ["Beverages", "Burgers", "Ice Cream"]);
  assert.equal(store.move("drinks", -1).ok, false); // already first
  assert.deepEqual(store.rename("iceCream", "Frozen"), { ok: false, error: "Ice Cream can't be changed: it marks the Dan Eric items." });
});

test("a category can't be deleted while products use it, or if it's Ice Cream", () => {
  const store = fresh();
  assert.deepEqual(store.remove("burgers", 3), { ok: false, error: "3 products use this category. Move them to another category first." });
  assert.equal(store.remove("iceCream", 0).ok, false);
  assert.ok(store.remove("drinks", 0).ok);
  assert.deepEqual(store.list().map((c) => c.id), ["burgers", "iceCream"]);
});
