import type { Metadata } from "next";
import { ChartColumn, IceCreamCone, Package, ShoppingCart } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

const highlights = [
  { icon: ShoppingCart, text: "One POS for burgers and ice cream" },
  { icon: Package, text: "Stock deducted automatically from every sale" },
  { icon: ChartColumn, text: "Daily sales, costs and profit at a glance" },
];

export default function LoginPage() {
  return (
    <main className="grid flex-1 lg:grid-cols-[1fr_minmax(0,560px)]">
      <section className="hidden flex-col justify-between bg-brand-soft p-12 lg:flex">
        <Logo />
        <div className="max-w-md">
          <h1 className="text-3xl leading-tight font-extrabold text-foreground">
            Run the whole shop from one screen.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Sales, inventory, costing and expenses for Bun &amp; Patty Burger House.
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm font-medium text-foreground">
                <span className="flex size-9 items-center justify-center rounded-md bg-background text-brand-strong shadow-sm">
                  <Icon className="size-5" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <IceCreamCone className="size-4 text-success" aria-hidden />
          Now with the ice cream menu on the same POS.
        </p>
      </section>

      <section className="flex flex-col justify-center px-4 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
          <p className="mt-1 mb-8 text-sm text-muted-foreground">
            Welcome back. Enter your account details to continue.
          </p>
          <LoginForm />
          <p className="mt-8 text-xs text-muted-foreground">
            Accounts are created by the shop owner in Users &amp; Roles.
          </p>
        </div>
      </section>
    </main>
  );
}
