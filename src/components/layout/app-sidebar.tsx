"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  Calculator,
  ChartColumn,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";

import { Logo } from "@/components/layout/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const navGroups = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Point of Sale", href: "/pos", icon: ShoppingCart },
    ],
  },
  {
    label: "Menu & Stock",
    items: [
      { title: "Products", href: "/products", icon: Package },
      { title: "Inventory", href: "/inventory", icon: Boxes },
      { title: "Costing & Pricing", href: "/costing", icon: Calculator },
      { title: "Suppliers", href: "/suppliers", icon: Truck },
    ],
  },
  {
    label: "Business",
    items: [
      { title: "Sales & Reports", href: "/reports", icon: ChartColumn },
      { title: "Expenses", href: "/expenses", icon: Receipt },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Users & Roles", href: "/users", icon: Users },
      { title: "Activity Logs", href: "/activity", icon: Activity },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar({ user }: { user: { name: string; role: string } }) {
  const pathname = usePathname();
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-6 pt-6 pb-2 transition-[padding] group-data-[collapsible=icon]:px-4">
        <Logo />
      </SidebarHeader>

      <SidebarContent className="gap-2 px-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.title}
                    className="h-10 gap-3 px-3 font-medium data-active:font-semibold group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-2.5! [&_svg]:size-5"
                  >
                    <item.icon aria-hidden />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 rounded-xl border bg-secondary p-3 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-strong text-xs font-semibold text-white"
            title={`${user.name} · ${user.role}`}
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.role}</p>
          </div>
          <Link
            href="/login"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden />
            <span className="sr-only">Log out</span>
          </Link>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
