import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },

  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.7.128"],

  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@tanstack/react-query",
      "socket.io-client",
      "recharts",
    ],
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.cloudinary.com" },
      { protocol: "https", hostname: "**.vercel-storage.com" },
      { protocol: "http",  hostname: "localhost" },
      { protocol: "http",  hostname: "127.0.0.1" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [96, 128, 256],
  },
};

export default nextConfig;
