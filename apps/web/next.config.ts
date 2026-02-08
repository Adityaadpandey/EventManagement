import type { NextConfig } from "next";
import withPWA from "next-pwa";

const withPWAConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Disable in dev to avoid warnings
  buildExcludes: [/app-build-manifest\.json$/, /dynamic-css-manifest\.json$/],
});

const nextConfig: NextConfig = {
  images: {
    domains: ["cdn.brave.photos", "api.tixin.in"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
};

export default withPWAConfig(nextConfig);
