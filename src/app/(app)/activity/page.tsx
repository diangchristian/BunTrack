import type { Metadata } from "next";
import { Suspense } from "react";

import { NoAccess } from "@/components/no-access";
import { canAdminister } from "@/features/auth/queries";
import { ActivityLog } from "@/features/activity/components/activity-log";
import { listActivity } from "@/features/activity/queries";
import Loading from "../loading";

export const metadata: Metadata = { title: "Activity Logs" };

// The whole page streams under its own Suspense: on a move between pages only the page
// re-renders, so (app)/loading.tsx sits too high to cover its reads.
export default function ActivityPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ActivityContent />
    </Suspense>
  );
}

async function ActivityContent() {
  // Owner only: family members' changes are recorded here, so they don't see or browse it.
  if (!(await canAdminister())) return <NoAccess page="Activity Logs" />;

  const entries = await listActivity();

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] leading-[30px] font-bold">Activity Logs</h1>
        <p className="text-sm text-muted-foreground">Every important change: who did it, when, and what changed. Entries can&apos;t be edited or deleted.</p>
      </div>
      <section className="rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
        <ActivityLog entries={entries} />
      </section>
    </div>
  );
}
