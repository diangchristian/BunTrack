import type { Metadata } from "next";

import { CostingWorkbench } from "@/features/inventory/components/costing-workbench";
import { getInventory } from "@/features/inventory/queries";
import { getProducts } from "@/features/products/queries";

export const metadata: Metadata = { title: "Costing & Pricing" };

export default async function CostingPage({ searchParams }: PageProps<"/costing">) {
  const [{ product }, products, { items, recipes }] = await Promise.all([searchParams, getProducts(), getInventory()]);

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
        initialProductId={typeof product === "string" ? product : undefined}
      />
    </div>
  );
}
