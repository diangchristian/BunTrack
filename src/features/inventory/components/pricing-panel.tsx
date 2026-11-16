"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProductPrice } from "@/features/products/actions";
import { productMargin } from "@/features/products/costing";
import { parsePesos } from "@/features/products/schemas";
import { formatCentavos } from "@/lib/format";
import { cn } from "@/lib/utils";
import { roundForMenu, suggestedPrice } from "../costing";

/** Pricing calculator + "suggest a price" for one product. Mount with a key per product. */
export function PricingPanel({
  productId,
  productName,
  cost,
  price,
  resold,
  pieces,
}: {
  productId: string;
  productName: string;
  /** null when the product has no recipe yet, so there's no real cost to compare against. */
  cost: number | null;
  price: number;
  resold: boolean;
  pieces: number;
}) {
  const [priceInput, setPriceInput] = useState((price / 100).toFixed(2));
  // Dan Eric margins are set by the dealer (~20%); made items aim for ~65% like Figma.
  const [target, setTarget] = useState(resold ? 20 : 65);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [saving, startSave] = useTransition();

  const unitLabel = pieces === 2 ? "per order (2 pcs)" : "per serving";
  const priceC = parsePesos(priceInput);
  const margin = priceC && cost !== null ? productMargin(priceC, cost) : null;
  const suggested = suggestedPrice(cost ?? 0, target);
  const rounded = roundForMenu(suggested);
  const atRounded = productMargin(rounded, cost ?? 0);

  function save() {
    setMessage(undefined);
    startSave(async () => {
      const result = await updateProductPrice(productId, priceInput);
      if (result.ok) toast.success(`Price saved: ${productName} now ${formatCentavos(priceC!)}`);
      setMessage(result.ok ? undefined : { ok: false, text: result.error! });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
        <div>
          <h2 className="text-[15px] font-semibold">Pricing calculator</h2>
          <p className="text-xs text-muted-foreground">{productName}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="selling-price" className="text-sm font-semibold text-muted-foreground">
            Selling price (₱)
          </Label>
          <Input id="selling-price" inputMode="decimal" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} className="h-10 tabular-nums" />
        </div>
        <div className="grid grid-cols-2 gap-3" aria-live="polite">
          <Metric label={resold ? "Dealer price" : "Production cost"} value={cost === null ? "No recipe" : formatCentavos(cost)} sub={resold ? "per unit" : unitLabel} tone="neutral" />
          <Metric label="Gross profit" value={margin ? formatCentavos(margin.profit) : "—"} sub={unitLabel} tone={margin && margin.profit < 0 ? "danger" : "success"} />
          <Metric label="Gross margin" value={margin ? `${margin.marginPercent}%` : "—"} sub="profit ÷ price" tone={margin && margin.profit < 0 ? "danger" : "success"} />
          <Metric label="Food cost" value={margin ? `${margin.foodCostPercent}%` : "—"} sub="cost ÷ price" tone="brand" />
        </div>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={cn("rounded-md px-3 py-2 text-sm", message.ok ? "bg-success-soft text-success-strong" : "bg-destructive-soft text-destructive")}>
            {message.text}
          </p>
        )}
        <Button className="h-10 font-semibold" onClick={save} disabled={saving || !priceC || priceC === price}>
          <Check data-icon="inline-start" /> {saving ? "Saving…" : priceC === price ? "Price is up to date" : "Save price"}
        </Button>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
        <div>
          <h2 className="text-[15px] font-semibold">Suggest a price</h2>
          <p className="text-xs text-muted-foreground">Based on a target gross margin</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="target-margin" className="text-sm font-medium text-muted-foreground">
              Target gross margin
            </Label>
            <span className="font-semibold text-brand-strong tabular-nums">{target}%</span>
          </div>
          <input
            id="target-margin"
            type="range"
            min={5}
            max={85}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        {cost ? (
          <>
            <div className="flex flex-col gap-1.5 rounded-[14px] bg-brand-soft p-4 text-sm">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Suggested price</span>
                <span className="text-lg font-bold tabular-nums">{formatCentavos(suggested)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Rounded for menu</span>
                <span className="font-semibold text-brand-strong tabular-nums">{formatCentavos(rounded)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Profit at {formatCentavos(rounded)}</span>
                <span className="font-semibold text-success-strong tabular-nums">
                  {formatCentavos(atRounded.profit)} · {atRounded.marginPercent}%
                </span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Suggested price = production cost ÷ (1 − target margin)</p>
            <Button variant="outline" className="h-10" onClick={() => setPriceInput((rounded / 100).toFixed(2))}>
              Use {formatCentavos(rounded)}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Add a recipe first; a price can&apos;t be suggested without a cost.</p>
        )}
      </section>
    </div>
  );
}

const tones = {
  neutral: "bg-neutral-soft text-foreground",
  success: "bg-success-soft text-success-strong",
  brand: "bg-brand-soft text-brand-strong",
  danger: "bg-destructive-soft text-destructive",
};

function Metric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: keyof typeof tones }) {
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-[10px] p-3.5", tones[tone])}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="text-xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  );
}
