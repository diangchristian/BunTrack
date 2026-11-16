import assert from "node:assert/strict";
import { test } from "node:test";

import { addError, setActiveError, updateError } from "./rules";
import type { User } from "./types";

const maria: User = { id: "maria", name: "Maria Reyes", email: "maria@example.ph", role: "Administrator", active: true };
const carlo: User = { id: "carlo", name: "Carlo Mendoza", email: "carlo@example.ph", role: "Family member", active: true };
const users = [maria, carlo];

test("adding, editing and deactivating a family member is allowed", () => {
  assert.equal(addError(users, { email: "ana@example.ph" }), null);
  assert.equal(updateError(users, "carlo", { email: "carlo@example.ph", role: "Family member" }, "maria"), null);
  assert.equal(setActiveError(users, "carlo", false, "maria"), null);
});

test("emails are unique, ignoring case", () => {
  assert.equal(addError(users, { email: "MARIA@example.ph" }), "Someone already uses that email.");
  assert.equal(updateError(users, "carlo", { email: "Maria@Example.ph", role: "Family member" }, "maria"), "Someone already uses that email.");
});

test("you can't lock yourself out or remove the last administrator", () => {
  assert.equal(setActiveError(users, "maria", false, "maria"), "You can't deactivate your own account.");
  assert.equal(updateError(users, "maria", { email: maria.email, role: "Family member" }, "maria"), "You can't change your own role.");
  assert.equal(updateError(users, "maria", { email: maria.email, role: "Family member" }, "carlo"), "Keep at least one active administrator.");
  assert.equal(setActiveError(users, "maria", false, "carlo"), "Keep at least one active administrator.");
});

test("an account that's gone can't be changed", () => {
  assert.equal(setActiveError(users, "nobody", true, "maria"), "This account no longer exists.");
});
