import "server-only";

import { getProducts } from "@/features/products/queries";
import type { MenuProduct } from "./types";

/** What the POS can sell. Production cost stays on the server; cashiers don't need it. */
export async function getMenu(): Promise<MenuProduct[]> {
  const products = await getProducts();
  return products.map(({ id, name, category, price, image, available, unavailableReason }) => ({
    id,
    name,
    category,
    price,
    image,
    available,
    unavailableReason,
  }));
}
