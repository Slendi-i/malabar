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
  reactStrictMode: true,
  // HTTPS and domain configuration
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://malabar-event.ru' : '',
  // Security headers for HTTPS
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ];
  },
  // Redirects configuration for domain migration
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.malabar-event.ru',
          },
        ],
        destination: 'https://malabar-event.ru/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'vet-klinika-moscow.ru',
          },
        ],
        destination: 'https://malabar-event.ru/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.vet-klinika-moscow.ru',
          },
        ],
        destination: 'https://malabar-event.ru/:path*',
        permanent: true,
      },
    ];
  },
  // Proxy API to backend on the same server to avoid CORS and explicit ports
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*'
      }
    ];
  },
  // Error handling configuration
  onDemandEntries: {
    // период (в мс), в течение которого страницы будут храниться в памяти
    maxInactiveAge: 25 * 1000,
    // количество страниц, которые должны храниться одновременно
    pagesBufferLength: 2,
  },
  // swcMinify is enabled by default in Next.js 15+
};

module.exports = nextConfig;
