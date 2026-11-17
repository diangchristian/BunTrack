import assert from "node:assert/strict";
import { test } from "vitest";
import { z } from "zod";

import { randomUuid } from "./uuid";

test("makes valid, distinct v4 UUIDs (what checkoutSchema accepts)", () => {
  const ids = Array.from({ length: 200 }, randomUuid);
  for (const id of ids) assert.ok(z.uuid({ version: "v4" }).safeParse(id).success, id);
  assert.equal(new Set(ids).size, ids.length);
});
