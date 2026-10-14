import type { NextConfig } from "next";

const API_ORIGIN = process.env.NOTERIV_API_ORIGIN ?? "http://127.0.0.1:4001";

const nextConfig: NextConfig = {
  output: "standalone",
  // Shown in Developer > Diagnostics so "which version is deployed?" has an answer.
  env: { NEXT_PUBLIC_BUILD_TIME: new Date().toISOString() },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
