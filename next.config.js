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
  // Webpack configuration to fix __webpack_require__.a error
  webpack: (config, { isServer }) => {
    // Fix for __webpack_require__.a is not a function error
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true
    };
    
    // Ensure proper module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    
    return config;
  },
  // Minimal experimental options
  experimental: {
    webpackBuildWorker: false,
    esmExternals: true
  },
  // Production optimizations
  poweredByHeader: false,
  reactStrictMode: true
  // swcMinify is enabled by default in Next.js 15+
};

module.exports = nextConfig;
