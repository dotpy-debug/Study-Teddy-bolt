module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/dashboard/tasks',
        'http://localhost:3000/dashboard/calendar',
        'http://localhost:3000/dashboard/focus',
        'http://localhost:3000/auth/signin',
      ],
      startServerCommand: 'bun run build && bun run start',
      startServerReadyPattern: 'Ready on',
      startServerReadyTimeout: 120000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          disabled: false,
        },
        emulatedUserAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
      }
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Mobile-optimized performance thresholds
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['warn', { minScore: 0.8 }],

        // Core Web Vitals - Mobile
        'first-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 600 }],
        'speed-index': ['error', { maxNumericValue: 4000 }],
        'interactive': ['error', { maxNumericValue: 5000 }],

        // Mobile-specific audits
        'viewport': ['error', { minScore: 1 }],
        'tap-targets': ['error', { minScore: 0.9 }],
        'content-width': ['error', { minScore: 1 }],

        // Resource optimization for mobile
        'unused-css-rules': ['warn', { maxNumericValue: 15000 }],
        'unused-javascript': ['warn', { maxNumericValue: 30000 }],
        'modern-image-formats': ['error', { minScore: 0.9 }],
        'offscreen-images': ['error', { minScore: 0.9 }],
        'efficient-animated-content': ['warn', { minScore: 0.8 }],

        // Network optimization for mobile
        'total-byte-weight': ['warn', { maxNumericValue: 1200000 }], // 1.2MB for mobile
        'dom-size': ['warn', { maxNumericValue: 1200 }],
        'uses-text-compression': ['error', { minScore: 1 }],
        'uses-responsive-images': ['error', { minScore: 0.9 }],

        // PWA features for mobile
        'installable-manifest': ['warn', { minScore: 1 }],
        'splash-screen': ['warn', { minScore: 1 }],
        'themed-omnibox': ['warn', { minScore: 1 }],
        'maskable-icon': ['warn', { minScore: 1 }],
      }
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};