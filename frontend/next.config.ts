import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["tedious", "tarn", "kysely", "better-auth"],
};

export default nextConfig;
