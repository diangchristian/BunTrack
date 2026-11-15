export type Category = { id: string; label: string };

/** The Dan Eric ice cream category: drives the dealer price, stock item and Ice Cream reports. Can't be renamed or deleted. */
export const ICE_CREAM = "iceCream";

/** A category's name, falling back for one that was deleted (old orders keep their category id). */
export const categoryLabel = (id: string, categories: Category[]) => categories.find((c) => c.id === id)?.label ?? "Removed category";
