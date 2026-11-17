import type { Metadata } from "next";
import { Suspense } from "react";

import { getCurrentUser } from "@/features/auth/queries";
import { listCategories } from "@/features/categories/queries";
import { PosScreen } from "@/features/pos/components/pos-screen";
import { getMenu } from "@/features/pos/queries";
import { getSettings } from "@/features/settings/queries";
import Loading from "../loading";

export const metadata: Metadata = { title: "Point of Sale" };

// The whole page streams under its own Suspense: on a move between pages only the page
// re-renders, so (app)/loading.tsx sits too high to cover its reads.
export default function PosPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PosContent />
    </Suspense>
  );
}

async function PosContent() {
  const [user, menu, categories, shop] = await Promise.all([getCurrentUser(), getMenu(), listCategories(), getSettings()]);
  return <PosScreen menu={menu} categories={categories} cashierName={user.name} shop={shop} />;
}
