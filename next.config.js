/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed 'output: export' to enable server mode for pm2
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Minimal experimental options
  experimental: {
    webpackBuildWorker: false
  },
  // Production optimizations
  poweredByHeader: false,
  reactStrictMode: true
  // swcMinify is enabled by default in Next.js 15+
};

module.exports = nextConfig;
