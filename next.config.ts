import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Tell Next.js to let these packages run natively on the server
  serverExternalPackages: ["mindee", "canvas"],
  
  // 2. (Optional) Keep your existing image domains if you have them
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;