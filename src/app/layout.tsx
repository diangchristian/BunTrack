import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Only the families the app uses; add more with "&family=Name:wght@..."
const GOOGLE_FONTS =
  "https://fonts.googleapis.com/css2?family=Gabarito:wght@400..900&family=Poppins:wght@400;500;600;700&display=swap";

export const metadata: Metadata = {
  title: {
    template: "%s | BunTrack",
    default: "BunTrack",
  },
  description: "Sales, stock and costing for Bun & Patty Burger House.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS} />
      </head>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        {/* Small notices after saves, deletes and stock changes. */}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
