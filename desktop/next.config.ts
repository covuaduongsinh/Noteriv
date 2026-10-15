import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Tauri loads from `out/` after `next build`. Asset prefix matches Tauri default.
  assetPrefix: process.env.NODE_ENV === "production" ? "" : undefined,
  // @noteriv/core ships TypeScript source (no build step); compile it with the app.
  transpilePackages: ["@noteriv/core"],
};

export default nextConfig;
