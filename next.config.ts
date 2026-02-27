import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Allow Convex and Clerk external images
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
