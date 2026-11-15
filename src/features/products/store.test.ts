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
  pieces: 1,
  available: true,
};
const fields = { name: "Pint", description: "Dan Eric", category: "iceCream", price: 9200, pieces: 1, available: true, image: undefined } as const;

test("a created product is listed with a new id", () => {
  const store = createProductStore([burger]);
  const created = store.create(fields);
  assert.notEqual(created.id, burger.id);
  assert.deepEqual(store.list().map((p) => p.name), ["Classic Cheeseburger", "Pint"]);
});

test("updating keeps the id; a price-only change keeps the photo, saving the form without one removes it", () => {
  const store = createProductStore([{ ...burger, image: "data:image/webp;base64,AAAA" }]);
  store.update(burger.id, { price: 15900 });
  assert.deepEqual([store.list()[0].id, store.list()[0].price, store.list()[0].image], [burger.id, 15900, "data:image/webp;base64,AAAA"]);
  store.update(burger.id, { ...fields, name: "Cheeseburger", category: "burgers", image: undefined });
  assert.deepEqual([store.list()[0].name, store.list()[0].image], ["Cheeseburger", undefined]);
});

test("archived products disappear from the list; unknown ids are reported", () => {
  const store = createProductStore([burger]);
  assert.equal(store.archive(burger.id), true);
  assert.deepEqual(store.list(), []);
  assert.equal(store.archive("nope"), false);
  assert.equal(store.update("nope", fields), undefined);
});

test("a price can be changed on its own (Costing & Pricing → Save price)", () => {
  const store = createProductStore([burger]);
  store.update(burger.id, { price: 16900 });
  assert.deepEqual([store.list()[0].price, store.list()[0].name], [16900, "Classic Cheeseburger"]);
});
