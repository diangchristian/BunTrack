import type { Metadata } from "next";

import { getCurrentUser } from "@/features/auth/queries";
import { categoryStore } from "@/features/categories/store";
import { PosScreen } from "@/features/pos/components/pos-screen";
import { getMenu } from "@/features/pos/queries";
import { settingsStore } from "@/features/settings/store";

export const metadata: Metadata = { title: "Point of Sale" };

export default async function PosPage() {
  const [user, menu] = await Promise.all([getCurrentUser(), getMenu()]);
  return <PosScreen menu={menu} categories={categoryStore.list()} cashierName={user.name} shop={settingsStore.get()} />;
}
