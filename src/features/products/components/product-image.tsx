import Image from "next/image";
import { CupSoda, Hamburger, IceCreamCone, UtensilsCrossed, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CategoryId, Product } from "../types";

const categoryIcons: Record<CategoryId, LucideIcon> = {
  burgers: Hamburger,
  combos: Hamburger,
  sides: UtensilsCrossed,
  drinks: CupSoda,
  iceCream: IceCreamCone,
};

/** The product photo, or a category icon tile until a photo is added. Size it with className. */
export function ProductImage({
  product,
  sizes,
  className,
}: {
  product: Pick<Product, "name" | "category" | "image" | "available">;
  sizes: string;
  className?: string;
}) {
  const Icon = categoryIcons[product.category];
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[10px]",
        product.available ? "bg-brand-soft text-primary" : "bg-neutral-soft text-muted-foreground",
        className,
      )}
    >
      {product.image ? (
        <Image src={product.image} alt={product.name} fill sizes={sizes} className="object-cover" />
      ) : (
        <Icon className="size-[45%]" aria-hidden />
      )}
    </div>
  );
}
