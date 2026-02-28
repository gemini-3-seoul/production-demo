import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // We use an environment variable or default to localhost:8081 for backend
        destination: `http://localhost:${process.env.API_PORT || 8081}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
