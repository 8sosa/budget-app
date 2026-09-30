import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Tell Next.js to let these packages run natively on the server
  serverExternalPackages: ["mindee", "canvas"],

  // Receipt uploads go through a server action; the default limit is 1MB
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },

  // 2. (Optional) Keep your existing image domains if you have them
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com', // Matches lh3, lh4, etc.
      },
    ],
  },
};

export default nextConfig;