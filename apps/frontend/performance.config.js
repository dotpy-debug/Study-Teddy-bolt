/**
 * Performance Configuration for StudyTeddy
 *
 * This file defines performance budgets and optimization settings
 * to ensure the application meets PRD requirements:
 * - p95 < 300ms latency
 * - Bundle < 250KB gzipped
 */

const performanceConfig = {
  // Bundle size budgets (in KB)
  budgets: {
    // Total bundle size (gzipped)
    totalBundle: 250,

    // Individual chunk sizes
    mainChunk: 150,
    vendorChunk: 100,
    cssBundle: 20,

    // Asset sizes
    images: 500, // per image
    fonts: 100,  // total fonts

    // Runtime budgets
    firstContentfulPaint: 1500,  // 1.5s
    largestContentfulPaint: 2500, // 2.5s
    firstInputDelay: 100,         // 100ms
    cumulativeLayoutShift: 0.1,   // 0.1
    totalBlockingTime: 300,       // 300ms
  },

  // Performance monitoring configuration
  monitoring: {
    // Web Vitals thresholds
    webVitals: {
      fcp: 1800,  // First Contentful Paint
      lcp: 2500,  // Largest Contentful Paint
      fid: 100,   // First Input Delay
      cls: 0.1,   // Cumulative Layout Shift
      ttfb: 800,  // Time to First Byte
    },

    // Custom metrics
    customMetrics: {
      apiResponseTime: 300,     // API p95 < 300ms
      pageLoadTime: 2000,       // Full page load < 2s
      interactionDelay: 50,     // Interaction response < 50ms
    },

    // Error tracking
    errorBudgets: {
      javascriptErrors: 0.1,    // < 0.1% error rate
      networkErrors: 0.5,       // < 0.5% network failures
      chunkLoadErrors: 0.01,    // < 0.01% chunk load failures
    },
  },

  // Build optimization settings
  optimization: {
    // Code splitting strategy
    codeSplitting: {
      chunks: 'all',
      minSize: 20000,
      maxSize: 150000,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        ui: {
          test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
          name: 'ui',
          chunks: 'all',
          priority: 20,
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
        },
      },
    },

    // Tree shaking configuration
    treeShaking: {
      sideEffects: false,
      usedExports: true,
      optimize: true,
    },

    // Minification settings
    minification: {
      removeConsole: true,
      removeDebugger: true,
      dropDeadCode: true,
      compressOptions: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },

    // Image optimization
    images: {
      formats: ['avif', 'webp'],
      quality: 80,
      sizes: [640, 750, 828, 1080, 1200, 1920, 2048],
      minimumCacheTTL: 31536000, // 1 year
    },

    // Font optimization
    fonts: {
      preload: ['Inter-Regular.woff2', 'Inter-Medium.woff2'],
      display: 'swap',
      fallback: 'system-ui, sans-serif',
    },
  },

  // Runtime performance configuration
  runtime: {
    // Lazy loading configuration
    lazyLoading: {
      images: true,
      components: true,
      routes: true,
      threshold: '200px',
    },

    // Caching strategy
    caching: {
      staticAssets: 31536000,    // 1 year
      apiResponses: 300,         // 5 minutes
      pageData: 3600,           // 1 hour
    },

    // Prefetching strategy
    prefetching: {
      criticalRoutes: ['/dashboard', '/tasks', '/ai-chat'],
      linkPrefetch: true,
      imagePrefetch: false,
    },
  },

  // Lighthouse CI configuration
  lighthouse: {
    ci: {
      collect: {
        numberOfRuns: 3,
        settings: {
          chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        },
      },
      assert: {
        assertions: {
          'categories:performance': ['error', { minScore: 0.8 }],
          'categories:accessibility': ['error', { minScore: 0.9 }],
          'categories:best-practices': ['error', { minScore: 0.8 }],
          'categories:seo': ['error', { minScore: 0.8 }],
          'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
          'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
          'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          'total-blocking-time': ['error', { maxNumericValue: 300 }],
        },
      },
      upload: {
        target: 'temporary-public-storage',
      },
    },
  },

  // Development performance tools
  development: {
    // Bundle analyzer
    bundleAnalyzer: {
      enabled: process.env.ANALYZE === 'true',
      openAnalyzer: false,
      analyzerMode: 'static',
      reportFilename: '../../../reports/bundle-analysis.html',
    },

    // Performance profiler
    profiler: {
      enabled: process.env.PROFILE === 'true',
      logLevel: 'info',
      measurementEvents: ['render', 'commit', 'mount'],
    },

    // Hot reload optimization
    hotReload: {
      overlay: true,
      quiet: false,
      stats: 'minimal',
    },
  },
};

module.exports = performanceConfig;