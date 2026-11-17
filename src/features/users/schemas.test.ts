import assert from "node:assert/strict";
import { test } from "vitest";

import { newUserSchema, parseRole, userFormSchema } from "./schemas";

const ana = { name: " Ana Cruz ", email: " Ana@Example.PH ", role: "Family member", username: "" };

test("the form trims, lowercases the email and checks the role", () => {
  const ok = userFormSchema.safeParse({ ...ana, password: "", username: "" });
  assert.ok(ok.success);
  assert.deepEqual(ok.data, { name: "Ana Cruz", email: "ana@example.ph", role: "Family member", password: "", username: "" });
  const bad = userFormSchema.safeParse({ name: "", email: "ana", role: "Boss", password: "", username: "" });
  assert.deepEqual(bad.error!.issues.map((i) => i.path[0]).sort(), ["email", "name", "role"]);
});

test("editing keeps the password when it's left blank, but a new one needs 8+ characters", () => {
  assert.ok(userFormSchema.safeParse({ ...ana, password: "" }).success);
  assert.ok(userFormSchema.safeParse({ ...ana, password: "longenough" }).success);
  assert.deepEqual(userFormSchema.safeParse({ ...ana, password: "short" }).error!.issues.map((i) => i.path[0]), ["password"]);
});

test("a new account must get a password", () => {
  assert.deepEqual(newUserSchema.safeParse({ ...ana, password: "" }).error!.issues.map((i) => i.path[0]), ["password"]);
  assert.ok(newUserSchema.safeParse({ ...ana, password: "longenough" }).success);
});

test("an unknown role from the database gets the least access", () => {
  assert.equal(parseRole("Administrator"), "Administrator");
  assert.equal(parseRole("administrator"), "Family member");
  assert.equal(parseRole(undefined), "Family member");
});

test("a username is optional; when given it's 3-30 letters, numbers, _ or .", () => {
  const withName = (username: string) => userFormSchema.safeParse({ ...ana, password: "", username });
  assert.equal(withName("").data?.username, "", "blank means no username");
  assert.equal(withName(" Ana.Cruz_2 ").data?.username, "Ana.Cruz_2", "trimmed, capitals kept for display");
  for (const bad of ["an", "a".repeat(31), "ana cruz", "ana@home", "ána"]) {
    assert.deepEqual(withName(bad).error?.issues.map((i) => i.path[0]), ["username"], bad);
  }
});
