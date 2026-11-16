import assert from "node:assert/strict";
import { test } from "node:test";

import { changePasswordSchema, loginSchema } from "./schemas";

test("signs in with an email or a username, plus a password", () => {
  assert.deepEqual(loginSchema.parse({ identifier: " Maria@BunAndPatty.ph ", password: "secret" }), {
    identifier: { by: "email", email: "maria@bunandpatty.ph" },
    password: "secret",
  });
  assert.deepEqual(loginSchema.parse({ identifier: " Maria_R ", password: "secret" }), {
    identifier: { by: "username", username: "maria_r" },
    password: "secret",
  });
});

test("rejects something that's neither, and an empty password", () => {
  const result = loginSchema.safeParse({ identifier: "maria reyes", password: "" });
  assert.deepEqual(result.error!.issues.map((issue) => issue.path[0]).sort(), ["identifier", "password"]);
  assert.equal(loginSchema.safeParse({ identifier: "maria@", password: "x" }).success, false, "has an @ but isn't an email");
});

test("rejects missing fields (FormData.get returns null)", () => {
  const result = loginSchema.safeParse({ identifier: null, password: null });
  assert.equal(result.success, false);
});

test("changing your password: confirm must match, 8+ characters, and it must actually change", () => {
  const fields = (r: { error?: { issues: { path: PropertyKey[] }[] } }) => r.error?.issues.map((i) => i.path[0]);
  assert.ok(changePasswordSchema.safeParse({ currentPassword: "old-secret", newPassword: "new-secret", confirmPassword: "new-secret" }).success);
  assert.deepEqual(fields(changePasswordSchema.safeParse({ currentPassword: "", newPassword: "short", confirmPassword: "short" })), ["currentPassword", "newPassword"]);
  assert.deepEqual(fields(changePasswordSchema.safeParse({ currentPassword: "old-secret", newPassword: "new-secret", confirmPassword: "typo-secret" })), ["confirmPassword"]);
  assert.deepEqual(fields(changePasswordSchema.safeParse({ currentPassword: "same-secret", newPassword: "same-secret", confirmPassword: "same-secret" })), ["newPassword"]);
});
