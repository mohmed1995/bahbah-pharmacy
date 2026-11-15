import type { NextConfig } from "next";

/**
 * Bahbah Pharmacy — static export build
 * `next build` produces a fully static `out/` folder ready for
 * Cloudflare Pages / any static host (instant loads, zero server cost).
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    /* required for static export — local images only */
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
