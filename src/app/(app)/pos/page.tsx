import type { Metadata } from "next";

import { getCurrentUser } from "@/features/auth/queries";
import { listCategories } from "@/features/categories/queries";
import { PosScreen } from "@/features/pos/components/pos-screen";
import { getMenu } from "@/features/pos/queries";
import { settingsStore } from "@/features/settings/store";

export const metadata: Metadata = { title: "Point of Sale" };

export default async function PosPage() {
  const [user, menu, categories] = await Promise.all([getCurrentUser(), getMenu(), listCategories()]);
  return <PosScreen menu={menu} categories={categories} cashierName={user.name} shop={settingsStore.get()} />;
}
