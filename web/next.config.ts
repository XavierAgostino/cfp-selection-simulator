import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "a.espncdn.com",
        pathname: "/**",
      },
    ],
  },
  // seed-fixtures:demo writes bundled demo JSON here at build time; without this,
  // Vercel's NFT tracer omits gitignored .demo-data from serverless functions.
  outputFileTracingIncludes: {
    "/*": ["./.demo-data/**/*"],
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
