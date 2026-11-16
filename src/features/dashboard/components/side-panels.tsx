import Link from "next/link";
import { AlertTriangle, Boxes, Plus, Receipt, ShoppingCart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyNote } from "@/components/empty-note";
import { cn } from "@/lib/utils";
import type { DashboardData } from "../queries";
import { Panel } from "./panel";

export function ProductPerformance({ items }: { items: DashboardData["bestSellers"] }) {
  const top = Math.max(1, ...items.map((i) => i.unitsSold));
  return (
    <Panel title="Product Performance" description="Best sellers · units sold this week">
      {items.length === 0 && <EmptyNote>No sales this week yet. Best sellers appear after the first orders.</EmptyNote>}
      <ol className="flex flex-col gap-4">
        {items.map((item, i) => (
          <li key={item.name} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 text-xs font-semibold text-muted-foreground">{i + 1}</span>
              <span className="flex-1 font-medium">{item.name}</span>
              <span className="font-semibold tabular-nums">{item.unitsSold} sold</span>
            </div>
            <div className="h-2 rounded-full bg-neutral-soft">
              <div
                className="h-2 rounded-full bg-chart-1"
                style={{ width: `${(item.unitsSold / top) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function LowStockAlerts({ items }: { items: DashboardData["lowStock"] }) {
  return (
    <Panel
      title="Low Stock Alerts"
      description="At or below minimum threshold"
      action={<Badge variant="danger">{items.length}</Badge>}
    >
      {items.length === 0 && <EmptyNote>Everything is above its reorder point.</EmptyNote>}
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.name} className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.left} left · min {item.min}
              </p>
            </div>
            <Badge variant={item.outOfStock ? "danger" : "warning"}>
              {item.outOfStock ? "Out of Stock" : "Low Stock"}
            </Badge>
          </li>
        ))}
      </ul>
      <Link href="/inventory" className={cn(buttonVariants({ variant: "outline" }), "h-10")}>
        <Boxes data-icon="inline-start" /> Restock ingredients
      </Link>
    </Panel>
  );
}

export function UnavailableProducts({ items }: { items: DashboardData["unavailableProducts"] }) {
  return (
    <Panel title="Unavailable on POS" description="Auto-disabled due to missing ingredients">
      {items.length === 0 && <EmptyNote>Every product that&apos;s switched on can be made right now.</EmptyNote>}
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-3 rounded-[10px] bg-destructive-soft p-3">
          <div className="flex-1">
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="text-xs text-destructive">{item.reason}</p>
          </div>
          <AlertTriangle className="size-[18px] text-destructive" aria-hidden />
        </div>
      ))}
    </Panel>
  );
}

const quickActions = [
  { label: "Create order", href: "/pos", icon: ShoppingCart, primary: true },
  { label: "Add product", href: "/products", icon: Plus },
  { label: "Add inventory", href: "/inventory", icon: Boxes },
  { label: "Record expense", href: "/expenses", icon: Receipt },
];

export function QuickActions() {
  return (
    <Panel title="Quick Actions">
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map(({ label, href, icon: Icon, primary }) => (
          <Link
            key={label}
            href={href}
            className={cn(buttonVariants({ variant: primary ? "default" : "outline" }), "h-10")}
          >
            <Icon data-icon="inline-start" /> {label}
          </Link>
        ))}
      </div>
    </Panel>
  );
}
