/**
 * Performance Budget Configuration for Study Teddy
 * Based on PRD requirements: p95 < 300ms latency, Bundle < 250KB gzipped
 */

module.exports = {
  // Bundle size budgets (gzipped)
  budgets: [
    {
      type: 'bundle',
      name: 'main',
      maximumSize: '250kb',
      maximumWarning: '200kb'
    },
    {
      type: 'bundle',
      name: 'vendor',
      maximumSize: '150kb',
      maximumWarning: '120kb'
    },
    {
      type: 'bundle',
      name: 'polyfills',
      maximumSize: '50kb',
      maximumWarning: '40kb'
    }
  ],

  // Asset budgets
  assets: {
    images: {
      max: '100kb',
      warning: '80kb'
    },
    fonts: {
      max: '50kb',
      warning: '40kb'
    }
  },

  // Performance metrics budgets
  metrics: {
    // Core Web Vitals
    LCP: 2500, // ms
    FID: 100,  // ms
    CLS: 0.1,  // score

    // Additional metrics
    FCP: 1800, // ms
    TTI: 3800, // ms
    TBT: 300,  // ms

    // API response times
    apiResponse: 300, // ms (p95)
    databaseQuery: 150 // ms (p95)
  },

  // Webpack bundle analyzer configuration
  analyzer: {
    enabled: process.env.ANALYZE === 'true',
    openAnalyzer: false,
    generateStatsFile: true,
    statsFilename: 'webpack-stats.json',
    reportFilename: 'bundle-report.html'
  }
};