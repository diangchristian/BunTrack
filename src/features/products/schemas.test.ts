import assert from "node:assert/strict";
import { test } from "node:test";

import { productFormSchema } from "./schemas";

const valid = {
  name: "  Ube Sundae ",
  description: "Ube soft serve, ube halaya, toppings",
  category: "iceCream",
  price: "75.00",
  available: "on",
};

test("turns form text into clean product data with centavo amounts", () => {
  const result = productFormSchema.safeParse(valid);
  assert.ok(result.success);
  assert.deepEqual(result.data, {
    name: "Ube Sundae",
    description: "Ube soft serve, ube halaya, toppings",
    category: "iceCream",
    price: 7500,
    available: true,
    pieces: 1,
  });
});

test("a missing checkbox means unavailable", () => {
  const result = productFormSchema.safeParse({ ...valid, available: null });
  assert.ok(result.success);
  assert.equal(result.data.available, false);
});

test("rejects a blank name, a zero or malformed price and a missing category", () => {
  const result = productFormSchema.safeParse({ ...valid, name: "  ", price: "0", category: "" });
  assert.equal(result.success, false);
  const fields = result.error!.issues.map((issue) => issue.path[0]).sort();
  assert.deepEqual(fields, ["category", "name", "price"]);

  assert.equal(productFormSchema.safeParse({ ...valid, price: "1,490" }).success, false);
  assert.equal(productFormSchema.safeParse({ ...valid, price: "14.999" }).success, false);
});

test("the Buy 1 Take 1 switch means 2 pieces per order", () => {
  assert.equal(productFormSchema.parse({ ...valid, b1t1: "on" }).pieces, 2);
  assert.equal(productFormSchema.parse({ ...valid, b1t1: null }).pieces, 1);
});

test("a product photo must be a small PNG, JPG or WebP; empty removes it", () => {
  const photo = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
  assert.equal(productFormSchema.parse({ ...valid, image: photo }).image, photo);
  assert.equal(productFormSchema.parse({ ...valid, image: "" }).image, undefined);
  assert.equal(productFormSchema.safeParse({ ...valid, image: "data:text/html;base64,PHNjcmlwdD4=" }).success, false);
  assert.equal(productFormSchema.safeParse({ ...valid, image: "javascript:alert(1)" }).success, false);
  assert.equal(productFormSchema.safeParse({ ...valid, image: `data:image/png;base64,${"A".repeat(800_000)}` }).success, false);
});

test("an ice cream's dealer's price is optional: blank leaves its cost as it is", () => {
  const form = { name: "1 Liter", description: "", category: "iceCream", price: "187", available: "on", b1t1: null, image: "" };
  assert.equal(productFormSchema.parse({ ...form, dealerPrice: "146" }).dealerPrice, 14600);
  assert.equal(productFormSchema.parse({ ...form, dealerPrice: "" }).dealerPrice, undefined);
  assert.equal(productFormSchema.parse(form).dealerPrice, undefined);
  assert.deepEqual(productFormSchema.safeParse({ ...form, dealerPrice: "abc" }).error?.issues.map((i) => i.message), ["Enter the dealer's price like 149 or 149.50"]);
});

test("a product's name is trimmed and repeated spaces collapse, so the duplicate check can't be dodged", () => {
  const form = { name: "  Coke   Float  16oz ", description: "", category: "drinks", price: "79", available: "on", b1t1: null, image: "" };
  assert.equal(productFormSchema.parse(form).name, "Coke Float 16oz");
});
