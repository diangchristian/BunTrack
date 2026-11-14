import assert from "node:assert/strict";
import { test } from "node:test";

import { loginSchema } from "./schemas";

test("accepts a valid email and password", () => {
  const result = loginSchema.safeParse({ email: "maria@bunandpatty.ph", password: "secret" });
  assert.equal(result.success, true);
});

test("rejects a malformed email and an empty password", () => {
  const result = loginSchema.safeParse({ email: "maria", password: "" });
  assert.equal(result.success, false);
  const fields = result.error!.issues.map((issue) => issue.path[0]);
  assert.deepEqual(fields.sort(), ["email", "password"]);
});

test("rejects missing fields (FormData.get returns null)", () => {
  const result = loginSchema.safeParse({ email: null, password: null });
  assert.equal(result.success, false);
});
