import assert from "node:assert/strict";
import { test } from "vitest";

import { addError, categoryIdFor, removeError, renameError, swapWithNeighbour } from "./rules";

const categories = [
  { id: "burgers", label: "Burgers", position: 0 },
  { id: "drinks", label: "Drinks", position: 1 },
  { id: "iceCream", label: "Ice Cream", position: 2 },
];

test("a new category gets a readable id from its name, made unique if needed", () => {
  assert.equal(categoryIdFor("Rice Meals", categories), "rice-meals");
  assert.equal(categoryIdFor("Burgers!", categories), "burgers-2");
  assert.equal(categoryIdFor("!!!", categories), "category");
});

test("names must be unique, ignoring case and spaces", () => {
  assert.equal(addError("Rice Meals", categories), null);
  assert.equal(addError("  drinks ", categories), "There's already a category called that.");
  assert.equal(renameError("drinks", "Beverages", categories), null);
  assert.equal(renameError("drinks", "Drinks", categories), null, "keeping its own name");
  assert.equal(renameError("drinks", "burgers", categories), "There's already a category called that.");
});

test("Ice Cream is locked because it marks the Dan Eric items", () => {
  const locked = "Ice Cream can't be changed: it marks the Dan Eric items.";
  assert.equal(renameError("iceCream", "Frozen", categories), locked);
  assert.equal(removeError("iceCream", { active: 0, archived: 0 }, categories), locked);
});

test("a category can't be deleted while products use it", () => {
  assert.equal(removeError("burgers", { active: 3, archived: 0 }, categories), "3 products use this category. Move them to another category first.");
  assert.equal(removeError("burgers", { active: 1, archived: 2 }, categories), "1 product uses this category. Move them to another category first.");
  assert.equal(removeError("drinks", { active: 0, archived: 0 }, categories), null);
  assert.equal(removeError("gone", { active: 0, archived: 0 }, categories), "This category no longer exists.");
});

test("archived products keep their category for old orders, so it stays (and says why)", () => {
  assert.equal(
    removeError("drinks", { active: 0, archived: 2 }, categories),
    "2 archived products still belong to this category, so their past sales keep it. Rename it instead.",
  );
});

test("moving swaps places with the neighbour, and stops at either end", () => {
  assert.deepEqual(swapWithNeighbour("burgers", 1, categories), [
    { id: "burgers", position: 1 },
    { id: "drinks", position: 0 },
  ]);
  assert.equal(swapWithNeighbour("burgers", -1, categories), null, "already first");
  assert.equal(swapWithNeighbour("iceCream", 1, categories), null, "already last");
});
