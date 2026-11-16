// Calendar days in the database. DATE columns hold a day with no time zone; Prisma passes them as
// a JS Date at UTC midnight. These convert between that and the app's "YYYY-MM-DD" Manila day.

/** "2026-11-17" → the Date Prisma writes to a DATE column. */
export const toDbDate = (day: string) => new Date(`${day}T00:00:00.000Z`);

/** A DATE column's value → "2026-11-17". */
export const fromDbDate = (date: Date) => date.toISOString().slice(0, 10);

/** How an order number is shown everywhere: 1001 → "#1001". */
export const orderLabel = (number: number) => `#${number}`;
