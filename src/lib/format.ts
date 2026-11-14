const wholePesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const pesosWithCents = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

/** ₱18,450 by default, ₱367.00 with cents. */
export function formatPeso(amount: number, { cents = false } = {}) {
  return (cents ? pesosWithCents : wholePesos).format(amount);
}
