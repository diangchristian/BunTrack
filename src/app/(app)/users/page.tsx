import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { Check, Minus, ShieldCheck, Users } from "lucide-react";

import { NoAccess } from "@/components/no-access";
import { canAdminister, getCurrentUser } from "@/features/auth/queries";
import { UsersManager } from "@/features/users/components/users-manager";
import { listUsers } from "@/features/users/queries";
import { permissions, roles } from "@/features/users/types";
import { cn } from "@/lib/utils";
import Loading from "../loading";

export const metadata: Metadata = { title: "Users & Roles" };

const roleIcon = { Administrator: ShieldCheck, "Family member": Users };
const roleTone = { Administrator: "bg-brand-soft text-brand-strong", "Family member": "bg-success-soft text-success-strong" };

// The whole page streams under its own Suspense: on a move between pages only the page
// re-renders, so (app)/loading.tsx sits too high to cover its reads.
export default function UsersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <UsersContent />
    </Suspense>
  );
}

async function UsersContent() {
  if (!(await canAdminister())) return <NoAccess page="Users & Roles" />;

  await connection();
  const [users, me] = await Promise.all([listUsers(), getCurrentUser()]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-[22px] leading-[30px] font-bold">Users &amp; Roles</h1>
        <p className="text-sm text-muted-foreground">Who in the family can use BunTrack, and what each role can do. Changes are recorded in Activity Logs.</p>
      </div>

      <section aria-label="Roles" className="grid gap-4 md:grid-cols-2">
        {roles.map((r) => {
          const Icon = roleIcon[r.id];
          const count = users.filter((u) => u.role === r.id && u.active).length;
          return (
            <div key={r.id} className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
              <div className="flex items-center gap-3">
                <span className={cn("flex size-10 items-center justify-center rounded-md", roleTone[r.id])}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[15px] font-semibold">{r.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {count} active {count === 1 ? "account" : "accounts"}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{r.description}</p>
            </div>
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
          <UsersManager users={users} currentUserId={me.id} />
        </section>
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(31_26_23/0.06)]">
          <div>
            <h2 className="text-[15px] font-semibold">Permissions</h2>
            <p className="text-xs text-muted-foreground">By role · checked on the server, not just hidden</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="py-2 text-left font-medium">Module</th>
                {roles.map((r) => (
                  <th key={r.id} className="w-16 py-2 text-center font-medium">
                    {r.id === "Administrator" ? "Admin" : "Family"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((p) => (
                <tr key={p.module} className="border-t">
                  <td className="py-2">{p.module}</td>
                  {roles.map((r) => (
                    <td key={r.id} className="py-2 text-center">
                      {p.roles.includes(r.id) ? (
                        <Check className="mx-auto size-4 text-success-strong" aria-label="Allowed" />
                      ) : (
                        <Minus className="mx-auto size-4 text-muted-foreground" aria-label="Not allowed" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">
            Family members can change prices, stock, recipes and expenses; every change is recorded in Activity Logs.
          </p>
        </section>
      </div>
    </div>
  );
}
