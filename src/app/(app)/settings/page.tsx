import type { Metadata } from "next";
import { connection } from "next/server";

import { NoAccess } from "@/components/no-access";
import { canAdminister } from "@/features/auth/queries";
import { CategoryManager } from "@/features/categories/components/category-manager";
import { listCategories, productCountsByCategory } from "@/features/categories/queries";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { getSettings } from "@/features/settings/queries";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  if (!(await canAdminister())) return <NoAccess page="Settings" />;

  await connection();
  const [categories, counts, settings] = await Promise.all([listCategories(), productCountsByCategory(), getSettings()]);
  // The list shows products on the menu; archived ones are explained if a delete is refused.
  const productCounts = Object.fromEntries(Object.entries(counts).map(([id, c]) => [id, c.active]));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] leading-[30px] font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Your shop&apos;s details, receipt and product categories. Accounts and roles are on the Users &amp; Roles page.</p>
      </div>
      <SettingsForm settings={settings} />
      <div className="xl:w-[calc(100%-364px)]">
        <CategoryManager categories={categories} productCounts={productCounts} />
      </div>
    </div>
  );
}
