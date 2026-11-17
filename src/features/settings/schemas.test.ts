import assert from "node:assert/strict";
import { test } from "vitest";

import { settingsSchema } from "./schemas";

test("shop details are trimmed; only the shop name is required", () => {
  const ok = settingsSchema.safeParse({ shopName: " Bun & Patty ", contactNumber: "", address: "", receiptFooter: " Salamat! " });
  assert.ok(ok.success);
  assert.deepEqual(ok.data, { shopName: "Bun & Patty", contactNumber: "", address: "", receiptFooter: "Salamat!" });
  const bad = settingsSchema.safeParse({ shopName: "  ", contactNumber: "", address: "", receiptFooter: "x".repeat(81) });
  assert.deepEqual(bad.error!.issues.map((i) => i.path[0]).sort(), ["receiptFooter", "shopName"]);
});
