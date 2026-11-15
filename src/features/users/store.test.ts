import assert from "node:assert/strict";
import { test } from "node:test";

import { userFormSchema } from "./schemas";
import { createUserStore } from "./store";
import type { User } from "./types";

const maria: User = { id: "maria", name: "Maria Reyes", email: "maria@example.ph", role: "Administrator", active: true };
const carlo: User = { id: "carlo", name: "Carlo Mendoza", email: "carlo@example.ph", role: "Manager", active: true };
const fresh = () => createUserStore([maria, carlo]);

test("add, edit and deactivate a family member's account", () => {
  const store = fresh();
  const added = store.add({ name: "Ana Cruz", email: "ana@example.ph", role: "Cashier" });
  assert.ok(added.ok);
  assert.ok(store.update(added.user.id, { name: "Ana Cruz", email: "ana@example.ph", role: "Manager" }, "maria").ok);
  assert.ok(store.setActive(added.user.id, false, "maria").ok);
  assert.deepEqual(store.list().find((u) => u.email === "ana@example.ph"), { ...added.user, role: "Manager", active: false });
});

test("emails are unique, ignoring case", () => {
  assert.deepEqual(fresh().add({ name: "Other Maria", email: "MARIA@example.ph", role: "Cashier" }), { ok: false, error: "Someone already uses that email." });
});

test("you can't lock yourself out or remove the last administrator", () => {
  const store = fresh();
  assert.deepEqual(store.setActive("maria", false, "maria"), { ok: false, error: "You can't deactivate your own account." });
  assert.deepEqual(store.update("maria", { ...maria, role: "Manager" }, "carlo"), { ok: false, error: "Keep at least one active administrator." });
  assert.deepEqual(store.setActive("maria", false, "carlo"), { ok: false, error: "Keep at least one active administrator." });
});

test("the form trims, lowercases the email and checks the role", () => {
  const ok = userFormSchema.safeParse({ name: " Ana Cruz ", email: " Ana@Example.PH ", role: "Cashier" });
  assert.ok(ok.success);
  assert.deepEqual(ok.data, { name: "Ana Cruz", email: "ana@example.ph", role: "Cashier" });
  const bad = userFormSchema.safeParse({ name: "", email: "ana", role: "Boss" });
  assert.deepEqual(bad.error!.issues.map((i) => i.path[0]).sort(), ["email", "name", "role"]);
});
