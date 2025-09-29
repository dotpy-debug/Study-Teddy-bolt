const { withSentryConfig } = require('@sentry/nextjs')

// Environment configuration
const isProd = process.env.NODE_ENV === 'production'
const isAnalyze = process.env.ANALYZE === 'true'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ============================================
  // Aggressive Bundle Size Optimization
  // ============================================

  // Output configuration
  output: 'standalone',
  outputFileTracingRoot: 'D:\\New_Projects\\STUDY Teddy - 51',
  swcMinify: true,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  generateEtags: true,
  compress: true,

  // Transpile only what's necessary
  transpilePackages: ['@studyteddy/shared'],

  // TypeScript & ESLint
  typescript: {
    ignoreBuildErrors: false, // Build-time type checking
  },
  eslint: {
    ignoreDuringBuilds: true, // Faster builds
  },

  // ============================================
  // Advanced Experimental Features
  // ============================================
  experimental: {
    // Optimize package imports aggressively
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@tanstack/react-query',
      'react-hook-form',
      'clsx',
      'tailwind-merge'
    ],

    // Enable all optimization features
    optimizeCss: true,
    typedRoutes: true,

    // Server components optimization
    serverComponentsExternalPackages: [
      'pg',
      'postgres',
      'drizzle-orm',
      'better-auth',
      'nodemailer'
    ],

    // Bundle optimization
    bundlePagesRouterDependencies: true,
    webpackBuildWorker: true,
  },

  // ============================================
  // Compiler Optimizations
  // ============================================
  compiler: {
    // Remove console in production
    removeConsole: isProd ? {
      exclude: ['error', 'warn'],
    } : false,

    // Remove React properties in production
    reactRemoveProperties: isProd ? {
      properties: ['^data-testid$', '^data-test$'],
    } : false,

    // Emotion optimization if needed
    styledComponents: false,
    emotion: false,
  },

  // ============================================
  // Image Optimization
  // ============================================
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },

  // ============================================
  // Module Import Optimizations
  // ============================================
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      preventFullImport: true,
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
      preventFullImport: true,
    },
    '@tanstack/react-query': {
      transform: '@tanstack/react-query/build/modern/{{member}}.js',
      preventFullImport: true,
    },
    'react-hook-form': {
      transform: 'react-hook-form/dist/{{member}}.js',
      preventFullImport: true,
    },
  },

  // ============================================
  // Webpack Configuration for Maximum Optimization
  // ============================================
  webpack: (config, { dev, isServer }) => {
    // Only apply in production client bundles
    if (!dev && !isServer) {
      // Aggressive chunk splitting
      config.optimization = {
        ...config.optimization,
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          minSize: 10000, // 10KB minimum
          maxSize: 100000, // 100KB maximum per chunk
          minRemainingSize: 0,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          enforceSizeThreshold: 50000,
          cacheGroups: {
            // Framework code
            framework: {
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-sync-external-store)[\\/]/,
              name: 'framework',
              priority: 40,
              reuseExistingChunk: true,
            },
            // Library code
            lib: {
              test(module) {
                return module.size() > 50000 &&
                  /node_modules[\\/]/.test(module.identifier())
              },
              name(module) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)[\\/]/
                )?.[1]
                return `lib-${packageName?.replace('@', '')}`
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // Common chunks
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
              reuseExistingChunk: true,
            },
            // Shared components
            shared: {
              test: /[\\/](components|features|lib|hooks)[\\/]/,
              name(module) {
                const match = module.identifier().match(/[\\/](components|features|lib|hooks)[\\/]/)
                return match ? `shared-${match[1]}` : 'shared'
              },
              priority: 10,
              reuseExistingChunk: true,
            },
            // CSS
            styles: {
              name: 'styles',
              type: 'css/mini-extract',
              chunks: 'all',
              enforce: true,
              priority: 50,
            },
          },
        },

        // Maximum optimization
        minimize: true,
        concatenateModules: true,
        usedExports: true,
        sideEffects: false,
        providedExports: true,
        innerGraph: true,
        mangleExports: 'size',
        moduleIds: 'size',
        chunkIds: 'total-size',

        // Tree shaking
        realContentHash: true,
        removeAvailableModules: true,
        removeEmptyChunks: true,
        mergeDuplicateChunks: true,
        flagIncludedChunks: true,
      }

      // Replace heavy modules with lighter alternatives
      config.resolve.alias = {
        ...config.resolve.alias,
        // Use preact in production for smaller bundle
        // 'react': 'preact/compat',
        // 'react-dom': 'preact/compat',

        // Use lighter alternatives
        'framer-motion': false,
        'recharts': false,
        '@radix-ui': false,
        'date-fns': 'date-fns/esm',

        // Exclude dev tools in production
        '@tanstack/react-query-devtools': false,
        '@sentry/react': isProd ? '@sentry/nextjs' : '@sentry/react',
      }

      // Ignore certain modules
      config.module.noParse = /^(vue|vue-router|vuex)$/

      // Performance hints
      config.performance = {
        maxAssetSize: 100000, // 100KB
        maxEntrypointSize: 250000, // 250KB total
        hints: 'error',
        assetFilter: (assetFilename) => {
          return !assetFilename.endsWith('.map')
        },
      }
    }

    // Bundle analyzer
    if (isAnalyze && !isServer) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: true,
          generateStatsFile: true,
          reportFilename: 'bundle-report.html',
        })
      )
    }

    return config
  },

  // ============================================
  // Headers for Caching & Performance
  // ============================================
  headers: async () => [
    {
      source: '/(.*).js',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/(.*).css',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
      ],
    },
  ],
}

// Sentry configuration (minimal in production)
const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  hideSourceMaps: true,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  disableLogger: true,
  automaticVercelMonitors: false,
}

// Export configuration
let config = nextConfig

// Apply Sentry only if needed
if (process.env.SENTRY_ENABLED === 'true' && isProd) {
  config = withSentryConfig(config, sentryWebpackPluginOptions)
}

module.exports = config