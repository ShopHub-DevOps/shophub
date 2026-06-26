import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  webpack: (config) => {
    // Prevent Webpack to look for these Wagmi optional modules
    config.resolve.alias = {
      ...config.resolve.alias,
      'porto/internal': false,
      'accounts': false,
    };
    
    // Standard fix for Web3 libraries in Next.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },

}

export default nextConfig;
