import "server-only";

import { connection } from "next/server";

import { productStore } from "./store";

/** All products on the menu, read at request time so edits show up immediately. */
export async function getProducts() {
  await connection();
  return productStore.list();
}
