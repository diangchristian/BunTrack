const toOneDecimal = (n: number) => Math.round(n * 10) / 10;

/** Profit per serving and margins. Price and cost are centavos; percentages have one decimal. */
export function productMargin(price: number, cost: number) {
  const profit = price - cost;
  return {
    profit,
    marginPercent: toOneDecimal((profit / price) * 100),
    foodCostPercent: toOneDecimal((cost / price) * 100),
  };
}
