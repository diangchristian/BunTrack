import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Phones testing the dev server through a Cloudflare quick tunnel (dev-only; no effect on builds).
  allowedDevOrigins: ["*.trycloudflare.com"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
