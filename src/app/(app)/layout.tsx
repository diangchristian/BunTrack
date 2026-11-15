import { Suspense } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/features/auth/queries";

/** The user is read at request time, so the sidebar streams in with a placeholder card first. */
async function SidebarWithUser() {
  const user = await getCurrentUser();
  return <AppSidebar user={user} />;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <Suspense fallback={<AppSidebar user={{ name: "…", role: "" }} />}>
        <SidebarWithUser />
      </Suspense>
      <SidebarInset>
        <TopBar />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
