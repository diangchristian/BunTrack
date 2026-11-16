import { TrendingDown, TrendingUp } from "lucide-react";

const signed = (n: number, digits = 0) => `${n >= 0 ? "+" : ""}${n.toFixed(digits)}`;

/** The small "+20.0% vs yesterday" line under a Dashboard or Reports stat. */
export function vsPrevious(now: number, before: number, label: string, as: "percent" | "count" = "percent") {
  // A percentage of zero is undefined, so the first day with sales would read "+Infinity%".
  if (as === "percent" && before === 0) return { text: `No sales ${label}`, kind: "neutral" } as const;
  // abs(): against a loss, a smaller loss is an improvement and should read as "+".
  const change = as === "percent" ? `${signed(((now - before) / Math.abs(before)) * 100, 1)}%` : signed(now - before);
  const up = now >= before;
  return { text: `${change} vs ${label}`, kind: up ? "up" : "down", icon: up ? TrendingUp : TrendingDown } as const;
}
