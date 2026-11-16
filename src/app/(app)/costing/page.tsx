import type { Metadata } from "next";

import { NoAccess } from "@/components/no-access";
import { canUseStore } from "@/features/auth/queries";
import { listCategories } from "@/features/categories/queries";
import { CostingWorkbench } from "@/features/inventory/components/costing-workbench";
import { getInventory } from "@/features/inventory/queries";
import { getProducts } from "@/features/products/queries";

export const metadata: Metadata = { title: "Costing & Pricing" };

export default async function CostingPage({ searchParams }: PageProps<"/costing">) {
  if (!(await canUseStore())) return <NoAccess page="Costing & Pricing" />;

  const [{ product }, products, { items, recipes }, categories] = await Promise.all([searchParams, getProducts(), getInventory(), listCategories()]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] leading-[30px] font-bold">Costing &amp; Pricing</h1>
        <p className="text-sm text-muted-foreground">
          Work out production cost, profit and the right selling price for each menu item.
        </p>
      </div>
      <CostingWorkbench
        products={products}
        items={items}
        recipes={recipes}
        categories={categories}
        initialProductId={typeof product === "string" ? product : undefined}
      />
    </div>
  );
}
