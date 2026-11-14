import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const tones = {
  brand: "bg-brand-soft text-brand-strong",
  success: "bg-success-soft text-success-strong",
  danger: "bg-destructive-soft text-destructive",
};

const deltaColors = {
  up: "text-success-strong",
  down: "text-destructive",
  neutral: "text-muted-foreground",
  alert: "text-destructive",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  delta,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: keyof typeof tones;
  delta?: { text: string; kind: keyof typeof deltaColors; icon?: LucideIcon };
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <span className={cn("flex size-9 items-center justify-center rounded-md", tones[tone])}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </div>
      <p className="text-[26px] leading-8 font-bold tabular-nums">{value}</p>
      {delta && (
        <p className={cn("flex items-center gap-1 text-xs font-semibold", deltaColors[delta.kind])}>
          {delta.icon && <delta.icon className="size-4" aria-hidden />}
          {delta.text}
        </p>
      )}
    </div>
  );
}
