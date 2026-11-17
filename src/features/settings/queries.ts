import "server-only";

import { cache } from "react";
import { connection } from "next/server";

import { db } from "@/lib/db";
import type { Settings } from "./schemas";

// Used until the owner first saves Settings.
const defaults: Settings = {
  shopName: "Bun & Patty Burger House",
  contactNumber: "",
  address: "",
  receiptFooter: "Salamat! Come back for more burgers.",
};

/** The business profile on receipts and the dashboard. A single row with id 1. */
export const getSettings = cache(async (): Promise<Settings> => {
  await connection();
  const row = await db.settings.findUnique({
    where: { id: 1 },
    select: { shopName: true, contactNumber: true, address: true, receiptFooter: true },
  });
  return row ?? defaults;
});
