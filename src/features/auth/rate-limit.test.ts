import assert from "node:assert/strict";
import { test } from "node:test";

import { lockedForMinutes, LOGIN_WINDOW_MS } from "./rate-limit";

const MIN = 60_000;
const t0 = Date.UTC(2026, 10, 17, 9, 0);

// `attempts` counts this try too (it's added before the password is checked), and
// `lastFailure` is when the last wrong password was entered.

test("up to 5 tries in a row are allowed", () => {
  for (let attempts = 1; attempts <= 5; attempts++) {
    assert.equal(lockedForMinutes({ attempts, lastFailure: t0 }, t0 + MIN), 0, `try ${attempts}`);
  }
});

test("the 6th try within 15 minutes of the last wrong password is refused", () => {
  assert.equal(lockedForMinutes({ attempts: 6, lastFailure: t0 }, t0), 15);
  assert.equal(lockedForMinutes({ attempts: 6, lastFailure: t0 }, t0 + 9 * MIN), 6, "rounds up the minutes left");
  assert.equal(lockedForMinutes({ attempts: 9, lastFailure: t0 }, t0 + 14.5 * MIN), 1, "more blocked tries don't extend it");
});

test("the window is 15 minutes", () => {
  assert.equal(LOGIN_WINDOW_MS, 15 * MIN);
});
