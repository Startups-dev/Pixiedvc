import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["pixiedvc-calculator"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "iyfpphzlyufhndpedijv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    externalDir: true,
    turbo: {
      resolveAlias: {
        "pixiedvc-calculator": "./packages/pixiedvc-calculator/src",
        "pixiedvc-calculator/engine/calc": "./packages/pixiedvc-calculator/src/engine/calc.ts",
        "pixiedvc-calculator/engine/charts": "./packages/pixiedvc-calculator/src/engine/charts.ts",
        "pixiedvc-calculator/engine/types": "./packages/pixiedvc-calculator/src/engine/types.ts",
      },
    },
  },
};

export default nextConfig;
