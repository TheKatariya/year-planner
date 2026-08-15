import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output keeps the Docker image small on the homelab,
  // matching how studio-os is packaged.
  output: "standalone",
};

export default nextConfig;
