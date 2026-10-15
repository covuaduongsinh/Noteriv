import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Tauri loads from `out/` after `next build`. Asset prefix matches Tauri default.
  assetPrefix: process.env.NODE_ENV === "production" ? "" : undefined,
  // @noteriv/core and @noteriv/ui ship TypeScript source (no build step); compile them with the app.
  transpilePackages: ["@noteriv/core", "@noteriv/ui", "@noteriv/plugin-api", "@noteriv/plugins"],
};

export default nextConfig;
