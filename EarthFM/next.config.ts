import type { NextConfig } from "next";

// EXPORT=1 produces a static snapshot (used to archive each UI iteration); default stays server-capable.
const nextConfig: NextConfig = process.env.EXPORT
  ? { output: "export", trailingSlash: true, images: { unoptimized: true }, basePath: process.env.NEXT_PUBLIC_BASE_PATH || "" }
  : {};

export default nextConfig;
