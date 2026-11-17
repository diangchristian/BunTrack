import type { MetadataRoute } from "next";

// Makes BunTrack installable (Add to Home Screen on iPhone/iPad, Install app on Android).
// No service worker: the app needs the server for prices and stock, so there's no offline mode to cache.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BunTrack",
    short_name: "BunTrack",
    description: "Sales, stock and costing for Bun & Patty Burger House.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
