#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Performance budget configuration
const PERFORMANCE_BUDGET = {
  // Bundle size limits (in KB)
  bundles: {
    'main': 250,
    'vendor': 400,
    'css': 50,
    'total': 800
  },

  // Performance metrics limits (in ms)
  metrics: {
    'first-contentful-paint': 2000,
    'largest-contentful-paint': 2500,
    'time-to-interactive': 3500,
    'total-blocking-time': 300,
    'cumulative-layout-shift': 0.1,
    'speed-index': 3000
  },

  // Resource limits
  resources: {
    'total-requests': 50,
    'total-size': 2000, // KB
    'image-size': 500,  // KB
    'font-size': 100    // KB
  }
};

class PerformanceBudgetChecker {
  constructor() {
    this.violations = [];
    this.warnings = [];
    this.results = {
      bundles: {},
      metrics: {},
      resources: {}
    };
  }

  async checkBundleSizes() {
    console.log('📦 Checking bundle sizes...');

    try {
      const buildDir = path.join(process.cwd(), 'apps/frontend/.next');

      if (!fs.existsSync(buildDir)) {
        console.log('⚠️  Build directory not found. Running build first...');
        execSync('bun run build', { stdio: 'inherit' });
      }

      // Analyze JavaScript bundles
      await this.analyzeBundles();

      // Check CSS bundles
      await this.analyzeCSS();

      // Calculate total bundle size
      this.calculateTotalBundleSize();

    } catch (error) {
      console.error('❌ Error checking bundle sizes:', error.message);
      this.violations.push({
        type: 'bundle',
        message: `Bundle analysis failed: ${error.message}`
      });
    }
  }

  async analyzeBundles() {
    const staticDir = path.join(process.cwd(), 'apps/frontend/.next/static');

    if (!fs.existsSync(staticDir)) {
      throw new Error('Static directory not found');
    }

    // Analyze main JavaScript bundles
    const jsDir = path.join(staticDir, 'chunks');
    if (fs.existsSync(jsDir)) {
      const files = fs.readdirSync(jsDir);

      let totalJSSize = 0;
      let mainBundleSize = 0;
      let vendorBundleSize = 0;

      files.forEach(file => {
        if (file.endsWith('.js')) {
          const filePath = path.join(jsDir, file);
          const stats = fs.statSync(filePath);
          const sizeKB = Math.round(stats.size / 1024);

          totalJSSize += sizeKB;

          if (file.includes('main')) {
            mainBundleSize += sizeKB;
          } else if (file.includes('framework') || file.includes('vendor')) {
            vendorBundleSize += sizeKB;
          }

          console.log(`  📄 ${file}: ${sizeKB} KB`);
        }
      });

      this.results.bundles.main = mainBundleSize;
      this.results.bundles.vendor = vendorBundleSize;
      this.results.bundles.totalJS = totalJSSize;

      // Check against budget
      if (mainBundleSize > PERFORMANCE_BUDGET.bundles.main) {
        this.violations.push({
          type: 'bundle',
          metric: 'main-bundle',
          actual: mainBundleSize,
          budget: PERFORMANCE_BUDGET.bundles.main,
          message: `Main bundle (${mainBundleSize} KB) exceeds budget (${PERFORMANCE_BUDGET.bundles.main} KB)`
        });
      }

      if (vendorBundleSize > PERFORMANCE_BUDGET.bundles.vendor) {
        this.violations.push({
          type: 'bundle',
          metric: 'vendor-bundle',
          actual: vendorBundleSize,
          budget: PERFORMANCE_BUDGET.bundles.vendor,
          message: `Vendor bundle (${vendorBundleSize} KB) exceeds budget (${PERFORMANCE_BUDGET.bundles.vendor} KB)`
        });
      }
    }
  }

  async analyzeCSS() {
    const staticDir = path.join(process.cwd(), 'apps/frontend/.next/static');
    const cssDir = path.join(staticDir, 'css');

    if (fs.existsSync(cssDir)) {
      const files = fs.readdirSync(cssDir);
      let totalCSSSize = 0;

      files.forEach(file => {
        if (file.endsWith('.css')) {
          const filePath = path.join(cssDir, file);
          const stats = fs.statSync(filePath);
          const sizeKB = Math.round(stats.size / 1024);

          totalCSSSize += sizeKB;
          console.log(`  🎨 ${file}: ${sizeKB} KB`);
        }
      });

      this.results.bundles.css = totalCSSSize;

      if (totalCSSSize > PERFORMANCE_BUDGET.bundles.css) {
        this.violations.push({
          type: 'bundle',
          metric: 'css-bundle',
          actual: totalCSSSize,
          budget: PERFORMANCE_BUDGET.bundles.css,
          message: `CSS bundle (${totalCSSSize} KB) exceeds budget (${PERFORMANCE_BUDGET.bundles.css} KB)`
        });
      }
    }
  }

  calculateTotalBundleSize() {
    const total = (this.results.bundles.totalJS || 0) + (this.results.bundles.css || 0);
    this.results.bundles.total = total;

    console.log(`📊 Total bundle size: ${total} KB`);

    if (total > PERFORMANCE_BUDGET.bundles.total) {
      this.violations.push({
        type: 'bundle',
        metric: 'total-bundle',
        actual: total,
        budget: PERFORMANCE_BUDGET.bundles.total,
        message: `Total bundle size (${total} KB) exceeds budget (${PERFORMANCE_BUDGET.bundles.total} KB)`
      });
    }
  }

  async checkLighthouseMetrics() {
    console.log('🔍 Checking Lighthouse performance metrics...');

    try {
      // Check if Lighthouse results exist
      const lighthouseResultsPath = path.join(process.cwd(), '.lighthouseci');

      if (fs.existsSync(lighthouseResultsPath)) {
        await this.analyzeLighthouseResults(lighthouseResultsPath);
      } else {
        console.log('⚠️  Lighthouse results not found. Run lighthouse tests first.');
        this.warnings.push({
          type: 'metrics',
          message: 'Lighthouse results not available for metric analysis'
        });
      }
    } catch (error) {
      console.error('❌ Error checking Lighthouse metrics:', error.message);
      this.violations.push({
        type: 'metrics',
        message: `Lighthouse analysis failed: ${error.message}`
      });
    }
  }

  async analyzeLighthouseResults(resultsPath) {
    const files = fs.readdirSync(resultsPath);
    const latestResult = files
      .filter(f => f.endsWith('.json'))
      .sort()
      .pop();

    if (!latestResult) {
      throw new Error('No Lighthouse results found');
    }

    const resultPath = path.join(resultsPath, latestResult);
    const results = JSON.parse(fs.readFileSync(resultPath, 'utf8'));

    // Extract performance metrics
    const audits = results.audits;

    const metrics = {
      'first-contentful-paint': audits['first-contentful-paint']?.numericValue,
      'largest-contentful-paint': audits['largest-contentful-paint']?.numericValue,
      'total-blocking-time': audits['total-blocking-time']?.numericValue,
      'cumulative-layout-shift': audits['cumulative-layout-shift']?.numericValue,
      'speed-index': audits['speed-index']?.numericValue
    };

    // Check against budget
    Object.entries(metrics).forEach(([metric, value]) => {
      if (value !== undefined && value !== null) {
        this.results.metrics[metric] = value;
        const budget = PERFORMANCE_BUDGET.metrics[metric];

        if (budget && value > budget) {
          this.violations.push({
            type: 'metrics',
            metric,
            actual: value,
            budget,
            message: `${metric} (${Math.round(value)}${metric === 'cumulative-layout-shift' ? '' : 'ms'}) exceeds budget (${budget}${metric === 'cumulative-layout-shift' ? '' : 'ms'})`
          });
        }

        console.log(`  ⚡ ${metric}: ${Math.round(value)}${metric === 'cumulative-layout-shift' ? '' : 'ms'}`);
      }
    });
  }

  async generateReport() {
    console.log('\n📋 Performance Budget Report');
    console.log('================================');

    // Bundle size summary
    console.log('\n📦 Bundle Sizes:');
    Object.entries(this.results.bundles).forEach(([bundle, size]) => {
      const budget = PERFORMANCE_BUDGET.bundles[bundle];
      const status = budget && size > budget ? '❌' : '✅';
      console.log(`  ${status} ${bundle}: ${size} KB ${budget ? `(budget: ${budget} KB)` : ''}`);
    });

    // Performance metrics summary
    if (Object.keys(this.results.metrics).length > 0) {
      console.log('\n⚡ Performance Metrics:');
      Object.entries(this.results.metrics).forEach(([metric, value]) => {
        const budget = PERFORMANCE_BUDGET.metrics[metric];
        const status = budget && value > budget ? '❌' : '✅';
        const unit = metric === 'cumulative-layout-shift' ? '' : 'ms';
        console.log(`  ${status} ${metric}: ${Math.round(value)}${unit} ${budget ? `(budget: ${budget}${unit})` : ''}`);
      });
    }

    // Violations
    if (this.violations.length > 0) {
      console.log('\n❌ Budget Violations:');
      this.violations.forEach((violation, index) => {
        console.log(`  ${index + 1}. ${violation.message}`);
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning.message}`);
      });
    }

    // Summary
    const totalIssues = this.violations.length;
    console.log('\n📊 Summary:');
    console.log(`  Violations: ${totalIssues}`);
    console.log(`  Warnings: ${this.warnings.length}`);

    if (totalIssues === 0) {
      console.log('  ✅ All performance budgets are within limits!');
    } else {
      console.log(`  ❌ ${totalIssues} performance budget violation(s) found.`);
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      budget: PERFORMANCE_BUDGET,
      results: this.results,
      violations: this.violations,
      warnings: this.warnings,
      summary: {
        totalViolations: this.violations.length,
        totalWarnings: this.warnings.length,
        passed: this.violations.length === 0
      }
    };

    fs.writeFileSync(
      path.join(process.cwd(), 'performance-budget-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📄 Detailed report saved to: performance-budget-report.json');

    return totalIssues === 0;
  }

  async run() {
    console.log('🚀 Starting Performance Budget Check...\n');

    await this.checkBundleSizes();
    await this.checkLighthouseMetrics();

    const passed = await this.generateReport();

    if (!passed) {
      process.exit(1);
    }
  }
}

// Run the performance budget checker
if (require.main === module) {
  const checker = new PerformanceBudgetChecker();
  checker.run().catch(error => {
    console.error('❌ Performance budget check failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceBudgetChecker;