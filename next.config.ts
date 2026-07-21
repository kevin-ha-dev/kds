import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/completed",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/inventory",
        destination: "/dashboard",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
