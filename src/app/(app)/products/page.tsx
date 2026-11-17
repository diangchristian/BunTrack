import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTriangle, CircleCheck, Package, TrendingUp } from "lucide-react";

import { NoAccess } from "@/components/no-access";
import { canUseStore } from "@/features/auth/queries";
import { StatCard } from "@/components/stat-card";
import { ProductsManager } from "@/features/products/components/products-manager";
import { productMargin } from "@/features/products/costing";
import { getProducts } from "@/features/products/queries";
import { isOnSale } from "@/features/products/types";
import { listCategories } from "@/features/categories/queries";
import Loading from "../loading";

export const metadata: Metadata = { title: "Products" };

// The whole page streams under its own Suspense: on a move between pages only the page
// re-renders, so (app)/loading.tsx sits too high to cover its reads.
export default function ProductsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProductsContent />
    </Suspense>
  );
}

async function ProductsContent() {
  if (!(await canUseStore())) return <NoAccess page="Products" />;

  const [products, categories] = await Promise.all([getProducts(), listCategories()]);
  const unavailable = products.filter((p) => !isOnSale(p));
  const costed = products.filter((p) => p.hasRecipe); // no recipe = no cost yet, so leave it out
  const avgMargin = costed.length
    ? costed.reduce((sum, p) => sum + productMargin(p.price, p.cost).marginPercent, 0) / costed.length
    : 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] leading-[30px] font-bold">Products</h1>
        <p className="text-sm text-muted-foreground">Manage menu items and pricing. Changes show on the POS right away.</p>
      </div>

      <section aria-label="Menu summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Menu Items"
          value={String(products.length)}
          icon={Package}
          delta={{ text: `${categories.length} categories`, kind: "neutral" }}
        />
        <StatCard
          label="Available on POS"
          value={String(products.length - unavailable.length)}
          icon={CircleCheck}
          tone="success"
          delta={{ text: "Ready to sell", kind: "neutral" }}
        />
        <StatCard
          label="Unavailable"
          value={String(unavailable.length)}
          icon={AlertTriangle}
          tone="danger"
          delta={{
            text: unavailable.length
              ? unavailable.slice(0, 2).map((p) => p.name).join(", ") + (unavailable.length > 2 ? ` +${unavailable.length - 2} more` : "")
              : "Everything is on sale",
            kind: unavailable.length ? "alert" : "neutral",
          }}
        />
        <StatCard
          label="Avg. Gross Margin"
          value={`${avgMargin.toFixed(1)}%`}
          icon={TrendingUp}
          tone="success"
          delta={{ text: "Across all menu items", kind: "neutral" }}
        />
      </section>

      <ProductsManager products={products} categories={categories} />
    </div>
  );
}
