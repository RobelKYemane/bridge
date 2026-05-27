import type { NextConfig } from "next";
import path from "node:path";

// GitHub Pages serves the site under /<repo>/. Override at build time with
// NEXT_PUBLIC_BASE_PATH if you fork to a different repo name.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/bridge";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
