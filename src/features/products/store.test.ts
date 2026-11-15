import assert from "node:assert/strict";
import { test } from "node:test";

import { createProductStore } from "./store";
import type { Product } from "./types";

const burger: Product = {
  id: "classic-cheeseburger",
  name: "Classic Cheeseburger",
  description: "Beef patty, cheese",
  category: "burgers",
  price: 14900,
  cost: 5840,
  stock: null,
  available: true,
};
const fields = { name: "Ube Sundae", description: "", category: "iceCream", price: 7500, cost: 3050, available: true } as const;

test("a created product is listed with a new id", () => {
  const store = createProductStore([burger]);
  const created = store.create(fields);
  assert.notEqual(created.id, burger.id);
  assert.deepEqual(store.list().map((p) => p.name), ["Classic Cheeseburger", "Ube Sundae"]);
});

test("updating changes the fields but keeps the id and photo", () => {
  const store = createProductStore([{ ...burger, image: "/products/burger.jpg" }]);
  const updated = store.update(burger.id, { ...fields, name: "Cheeseburger", category: "burgers", price: 15900 });
  assert.equal(updated?.id, burger.id);
  assert.equal(updated?.image, "/products/burger.jpg");
  assert.equal(store.list()[0].price, 15900);
});

test("making a product available again clears its out-of-stock reason", () => {
  const store = createProductStore([{ ...burger, available: false, unavailableReason: "Out of buns" }]);
  store.update(burger.id, { ...fields, available: true });
  assert.equal(store.list()[0].unavailableReason, undefined);
});

test("ice cream is counted by unit and starts at 0; made items are not counted", () => {
  const store = createProductStore([burger]);
  assert.equal(store.create(fields).stock, 0);
  assert.equal(store.create({ ...fields, category: "burgers" }).stock, null);
});

test("editing an ice cream item keeps its stock count", () => {
  const store = createProductStore([{ ...burger, id: "pint", category: "iceCream", stock: 13 }]);
  assert.equal(store.update("pint", { ...fields, price: 9200 })?.stock, 13);
});

test("selling deducts units, and refuses the whole sale if any item is short", () => {
  const store = createProductStore([
    { ...burger, stock: null },
    { ...burger, id: "pint", category: "iceCream", stock: 3 },
  ]);
  assert.equal(store.sell([{ productId: "pint", quantity: 2 }, { productId: burger.id, quantity: 5 }]), true);
  assert.equal(store.list().find((p) => p.id === "pint")?.stock, 1);

  assert.equal(store.sell([{ productId: burger.id, quantity: 1 }, { productId: "pint", quantity: 2 }]), false);
  assert.equal(store.list().find((p) => p.id === "pint")?.stock, 1);
});

test("archived products disappear from the list; unknown ids are reported", () => {
  const store = createProductStore([burger]);
  assert.equal(store.archive(burger.id), true);
  assert.deepEqual(store.list(), []);
  assert.equal(store.archive("nope"), false);
  assert.equal(store.update("nope", fields), undefined);
});
