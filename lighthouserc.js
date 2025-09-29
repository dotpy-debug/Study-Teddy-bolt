module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/dashboard/tasks',
        'http://localhost:3000/dashboard/calendar',
        'http://localhost:3000/dashboard/focus',
        'http://localhost:3000/dashboard/analytics',
        'http://localhost:3000/auth/signin',
        'http://localhost:3000/auth/signup',
      ],
      startServerCommand: 'bun run build && bun run start',
      startServerReadyPattern: 'Ready on',
      startServerReadyTimeout: 120000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        formFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        emulatedUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Chrome-Lighthouse'
      }
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['warn', { minScore: 0.8 }],

        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],
        'interactive': ['error', { maxNumericValue: 3000 }],

        // Resource optimization
        'unused-css-rules': ['warn', { maxNumericValue: 20000 }],
        'unused-javascript': ['warn', { maxNumericValue: 40000 }],
        'modern-image-formats': ['warn', { minScore: 0.8 }],
        'offscreen-images': ['warn', { minScore: 0.8 }],
        'render-blocking-resources': ['warn', { maxNumericValue: 500 }],

        // Network
        'total-byte-weight': ['warn', { maxNumericValue: 1600000 }], // 1.6MB
        'dom-size': ['warn', { maxNumericValue: 1500 }],

        // Security
        'is-on-https': ['error', { minScore: 1 }],
        'external-anchors-use-rel-noopener': ['error', { minScore: 1 }],

        // Accessibility
        'color-contrast': ['error', { minScore: 1 }],
        'image-alt': ['error', { minScore: 1 }],
        'label': ['error', { minScore: 1 }],
        'link-name': ['error', { minScore: 1 }],

        // Best Practices
        'errors-in-console': ['warn', { maxNumericValue: 0 }],
        'no-vulnerable-libraries': ['error', { minScore: 1 }],
      }
    },
    upload: {
      target: 'temporary-public-storage',
      // For production, consider using LHCI server:
      // target: 'lhci',
      // serverBaseUrl: 'https://your-lhci-server.com',
      // token: process.env.LHCI_TOKEN,
    },
    server: {
      port: 9001,
      storage: {
        storageMethod: 'sql',
        sqlDialect: 'sqlite',
        sqlDatabasePath: './lighthouse-ci.db',
      },
    },
  },
};

// Mobile configuration
const mobileConfig = {
  ...module.exports,
  ci: {
    ...module.exports.ci,
    collect: {
      ...module.exports.ci.collect,
      settings: {
        ...module.exports.ci.collect.settings,
        preset: 'mobile',
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          disabled: false,
        },
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        emulatedUserAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
      }
    },
    assert: {
      ...module.exports.ci.assert,
      assertions: {
        ...module.exports.ci.assert.assertions,
        // Adjusted thresholds for mobile
        'categories:performance': ['error', { minScore: 0.8 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 4000 }],
        'speed-index': ['error', { maxNumericValue: 4000 }],
        'interactive': ['error', { maxNumericValue: 5000 }],
      }
    }
  }
};

// Export mobile config separately for mobile-specific runs
module.exports.mobile = mobileConfig;