import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

module.exports = {
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true, // Отключает проверку ESLint при сборке
  },
};


export default nextConfig;
