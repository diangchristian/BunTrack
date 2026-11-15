import type { Metadata } from "next";
import { connection } from "next/server";

import { NoAccess } from "@/components/no-access";
import { canUseStore } from "@/features/auth/queries";
import { ActivityLog } from "@/features/activity/components/activity-log";
import { activityStore } from "@/features/activity/store";

export const metadata: Metadata = { title: "Activity Logs" };

export default async function ActivityPage() {
  if (!(await canUseStore())) return <NoAccess page="Activity Logs" />;

  await connection(); // always the latest entries

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] leading-[30px] font-bold">Activity Logs</h1>
        <p className="text-sm text-muted-foreground">Every important change: who did it, when, and what changed. Entries can&apos;t be edited or deleted.</p>
      </div>
      <section className="rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
        {/* shortcut: newest 500 only; filter on the server with pagination once the log is in the database. */}
        <ActivityLog entries={activityStore.list().slice(0, 500)} />
      </section>
    </div>
  );
}
