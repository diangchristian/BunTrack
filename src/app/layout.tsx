import type { Metadata } from "next";
import { Gabarito, Onest } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import "./globals.css";

const fontSans = Onest({ variable: "--font-onest", subsets: ["latin"] });
const fontHeading = Gabarito({ variable: "--font-gabarito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | BunTrack",
    default: "BunTrack",
  },
  description: "Sales, stock and costing for Bun & Patty Burger House.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("h-full antialiased font-sans", fontSans.variable, fontHeading.variable)}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
