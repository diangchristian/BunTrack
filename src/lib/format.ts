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
