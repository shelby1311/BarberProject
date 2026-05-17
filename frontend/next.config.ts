import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },

  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.7.128", "192.168.1.3"],

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
      { protocol: "http",  hostname: "localhost", port: "3001", pathname: "/uploads/**" },
      { protocol: "http",  hostname: "127.0.0.1", port: "3001", pathname: "/uploads/**" },
      { protocol: "http",  hostname: "192.168.1.3", port: "3001", pathname: "/uploads/**" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [96, 128, 256],
  },
};

export default nextConfig;
