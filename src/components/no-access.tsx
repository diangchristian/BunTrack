import Link from "next/link";
import { Lock } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

/** Shown when the signed-in role isn't allowed on a page (see Users & Roles → Permissions). */
export function NoAccess({ page }: { page: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <Lock className="size-8 text-muted-foreground" aria-hidden />
      <h1 className="text-lg font-bold">{page} isn&apos;t available for your role</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Ask the owner if you need access. You can still take orders on the POS.</p>
      <Link href="/pos" className={buttonVariants({ variant: "outline" })}>
        Go to the POS
      </Link>
    </div>
  );
}
