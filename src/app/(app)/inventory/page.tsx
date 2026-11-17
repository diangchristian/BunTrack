import type { Metadata } from "next";
import { AlertTriangle, Boxes, CircleCheck, Coins, XCircle } from "lucide-react";

import { NoAccess } from "@/components/no-access";
import { canAdminister, canUseStore } from "@/features/auth/queries";
import { StatCard } from "@/components/stat-card";
import { InventoryManager } from "@/features/inventory/components/inventory-manager";
import { stockStatus, stockValue } from "@/features/inventory/costing";
import { getInventory } from "@/features/inventory/queries";
import { formatPeso } from "@/lib/format";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  if (!(await canUseStore())) return <NoAccess page="Inventory" />;

  const [{ items, movements, usedBy, sellsFor }, isAdmin] = await Promise.all([getInventory(), canAdminister()]);
  const count = (s: ReturnType<typeof stockStatus>) => items.filter((i) => stockStatus(i) === s);
  const out = count("out");
  const totalValue = items.reduce((sum, i) => sum + stockValue(i), 0);
  const blocked = [...new Set(out.flatMap((i) => usedBy[i.id] ?? []))];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] leading-[30px] font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Ingredients and Dan Eric ice cream stock. Completed POS orders deduct their recipe automatically.
        </p>
      </div>

      <section aria-label="Stock summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Items" value={String(items.length)} icon={Boxes} delta={{ text: "Ingredients and ice cream", kind: "neutral" }} />
        <StatCard label="In Stock" value={String(count("in").length)} icon={CircleCheck} tone="success" delta={{ text: "At or above minimum", kind: "neutral" }} />
        <StatCard label="Low Stock" value={String(count("low").length)} icon={AlertTriangle} tone="brand" delta={{ text: "Reorder soon", kind: "neutral" }} />
        <StatCard
          label="Out of Stock"
          value={String(out.length)}
          icon={XCircle}
          tone="danger"
          delta={{ text: blocked.length ? `Blocks ${blocked.length} menu item${blocked.length === 1 ? "" : "s"}` : "Nothing blocked", kind: blocked.length ? "alert" : "neutral" }}
        />
        <StatCard label="Stock Value" value={formatPeso(Math.round(totalValue) / 100)} icon={Coins} delta={{ text: "At current unit cost", kind: "neutral" }} />
      </section>

      <InventoryManager items={items} movements={movements} usedBy={usedBy} sellsFor={sellsFor} isAdmin={isAdmin} />
    </div>
  );
}
