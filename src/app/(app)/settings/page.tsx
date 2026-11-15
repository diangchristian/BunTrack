import type { Metadata } from "next";
import { connection } from "next/server";

import { NoAccess } from "@/components/no-access";
import { canAdminister } from "@/features/auth/queries";
import { CategoryManager } from "@/features/categories/components/category-manager";
import { categoryStore } from "@/features/categories/store";
import { productStore } from "@/features/products/store";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { settingsStore } from "@/features/settings/store";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  if (!(await canAdminister())) return <NoAccess page="Settings" />;

  await connection();
  const productCounts: Record<string, number> = {};
  for (const p of productStore.list()) productCounts[p.category] = (productCounts[p.category] ?? 0) + 1;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] leading-[30px] font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Your shop&apos;s details, receipt and product categories. Accounts and roles are on the Users &amp; Roles page.</p>
      </div>
      <SettingsForm settings={settingsStore.get()} />
      <div className="xl:w-[calc(100%-364px)]">
        <CategoryManager categories={categoryStore.list()} productCounts={productCounts} />
      </div>
    </div>
  );
}
