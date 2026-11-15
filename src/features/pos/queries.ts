import "server-only";

import { getProducts } from "@/features/products/queries";
import { toMenuProduct } from "./service";

/** What the POS can sell. */
export async function getMenu() {
  return (await getProducts()).map(toMenuProduct);
}
