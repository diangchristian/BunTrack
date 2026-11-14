// Pure money math shared by the POS screen (preview) and the server action (source of truth).
// Amounts are integer centavos. Menu prices already include 12% VAT.

export function orderTotals(lines: { unitPrice: number; quantity: number }[]) {
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  // VAT-inclusive: the VAT portion of a price P is P × 12/112.
  return { itemCount, total, vat: Math.round((total * 12) / 112) };
}

export function changeDue(total: number, received: number) {
  return Math.max(0, received - total);
}

/** Exact amount, then the total rounded up to the next ₱100, ₱500 and ₱1,000. */
export function quickCashOptions(total: number) {
  const roundedUp = [10000, 50000, 100000].map((bill) => Math.ceil(total / bill) * bill);
  return [total, ...new Set(roundedUp.filter((amount) => amount > total))];
}
