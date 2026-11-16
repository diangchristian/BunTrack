import assert from "node:assert/strict";
import { test } from "node:test";

import { changePasswordSchema, loginSchema } from "./schemas";

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

test("changing your password: confirm must match, 8+ characters, and it must actually change", () => {
  const fields = (r: { error?: { issues: { path: PropertyKey[] }[] } }) => r.error?.issues.map((i) => i.path[0]);
  assert.ok(changePasswordSchema.safeParse({ currentPassword: "old-secret", newPassword: "new-secret", confirmPassword: "new-secret" }).success);
  assert.deepEqual(fields(changePasswordSchema.safeParse({ currentPassword: "", newPassword: "short", confirmPassword: "short" })), ["currentPassword", "newPassword"]);
  assert.deepEqual(fields(changePasswordSchema.safeParse({ currentPassword: "old-secret", newPassword: "new-secret", confirmPassword: "typo-secret" })), ["confirmPassword"]);
  assert.deepEqual(fields(changePasswordSchema.safeParse({ currentPassword: "same-secret", newPassword: "same-secret", confirmPassword: "same-secret" })), ["newPassword"]);
});
