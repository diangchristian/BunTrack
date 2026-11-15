import type { Product } from "@/features/products/types";

export { categories, type CategoryId } from "@/features/products/types";

export type MenuProduct = Pick<Product, "id" | "name" | "category" | "price" | "image" | "stock" | "available" | "unavailableReason">;

export type PaymentMethod = "cash" | "gcash";

export type Receipt = {
  orderNumber: string;
  completedAt: string;
  method: PaymentMethod;
  lines: { productId: string; name: string; quantity: number; lineTotal: number }[];
  total: number;
  received: number;
  change: number;
};
