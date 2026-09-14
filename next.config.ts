import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep dynamic RSC payloads in the client cache so back/forward and
    // repeat visits (dashboard ↔ lists) do not refetch for 30s.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
