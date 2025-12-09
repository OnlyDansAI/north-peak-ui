import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable if embedding in iframes
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOWALL", // Allow iframe embedding
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *", // Allow any parent to embed
          },
        ],
      },
    ];
  },
};

export default nextConfig;
