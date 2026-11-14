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

test("archived products disappear from the list; unknown ids are reported", () => {
  const store = createProductStore([burger]);
  assert.equal(store.archive(burger.id), true);
  assert.deepEqual(store.list(), []);
  assert.equal(store.archive("nope"), false);
  assert.equal(store.update("nope", fields), undefined);
});
