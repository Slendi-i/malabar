import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true, // Отключает проверку ESLint при сборке
  },
};

export default nextConfig;
