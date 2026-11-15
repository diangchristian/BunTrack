const wholePesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const pesosWithCents = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

/** ₱18,450 by default, ₱367.00 with cents. */
export function formatPeso(amount: number, { cents = false } = {}) {
  return (cents ? pesosWithCents : wholePesos).format(amount);
}

/** Money stored as integer centavos (₱1 = 100), shown as ₱149.00. */
export function formatCentavos(centavos: number) {
  return pesosWithCents.format(centavos / 100);
}

/** Today's date in the shop's timezone as YYYY-MM-DD (en-CA formats it that way). */
export function manilaDate(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

/** "2026-11-16" is a real calendar day (not 2026-02-30) and not after today in Manila. */
export function isRealPastDate(d: string) {
  const parsed = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(d) && d <= manilaDate();
}

/** "2026-11-16" → "Nov 16" (the date as written, no timezone shift). */
export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
