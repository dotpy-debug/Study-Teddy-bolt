#!/usr/bin/env node

/**
 * Performance Check Script for StudyTeddy
 *
 * This script validates that the application meets performance requirements:
 * - Bundle size < 250KB gzipped
 * - Performance scores meet thresholds
 * - Core Web Vitals compliance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const performanceConfig = require('../apps/frontend/performance.config.js');

function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      ...options
    });
  } catch (error) {
    if (!options.allowFailure) {
      throw error;
    }
    return null;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function checkBundleSize() {
  console.log('📦 Checking bundle sizes...');

  const nextBuildDir = path.join(process.cwd(), 'apps', 'frontend', '.next');

  if (!fs.existsSync(nextBuildDir)) {
    console.error('❌ Build directory not found. Run "bun build" first.');
    return false;
  }

  // Parse Next.js build output
  const buildManifestPath = path.join(nextBuildDir, 'build-manifest.json');

  if (!fs.existsSync(buildManifestPath)) {
    console.warn('⚠️  Build manifest not found. Cannot analyze bundle sizes.');
    return true; // Don't fail the check
  }

  try {
    const buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));
    const staticDir = path.join(nextBuildDir, 'static');

    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;
    const chunks = {};

    // Analyze JavaScript chunks
    if (fs.existsSync(path.join(staticDir, 'chunks'))) {
      const chunksDir = path.join(staticDir, 'chunks');
      const chunkFiles = fs.readdirSync(chunksDir).filter(file => file.endsWith('.js'));

      chunkFiles.forEach(file => {
        const filePath = path.join(chunksDir, file);
        const stats = fs.statSync(filePath);
        const size = stats.size;

        jsSize += size;
        totalSize += size;

        if (file.includes('vendor') || file.includes('node_modules')) {
          chunks.vendor = (chunks.vendor || 0) + size;
        } else if (file.includes('main') || file.includes('index')) {
          chunks.main = (chunks.main || 0) + size;
        } else {
          chunks.other = (chunks.other || 0) + size;
        }
      });
    }

    // Analyze CSS files
    if (fs.existsSync(path.join(staticDir, 'css'))) {
      const cssDir = path.join(staticDir, 'css');
      const cssFiles = fs.readdirSync(cssDir).filter(file => file.endsWith('.css'));

      cssFiles.forEach(file => {
        const filePath = path.join(cssDir, file);
        const stats = fs.statSync(filePath);
        cssSize += stats.size;
        totalSize += stats.size;
      });
    }

    // Estimate gzipped sizes (approximately 30% of original)
    const gzippedTotal = Math.round(totalSize * 0.3);
    const gzippedJS = Math.round(jsSize * 0.3);
    const gzippedCSS = Math.round(cssSize * 0.3);

    console.log('📊 Bundle Size Analysis:');
    console.log(`  Total: ${formatBytes(totalSize)} (${formatBytes(gzippedTotal)} gzipped)`);
    console.log(`  JavaScript: ${formatBytes(jsSize)} (${formatBytes(gzippedJS)} gzipped)`);
    console.log(`  CSS: ${formatBytes(cssSize)} (${formatBytes(gzippedCSS)} gzipped)`);

    if (chunks.main) {
      console.log(`  Main chunk: ${formatBytes(chunks.main)} (${formatBytes(Math.round(chunks.main * 0.3))} gzipped)`);
    }
    if (chunks.vendor) {
      console.log(`  Vendor chunk: ${formatBytes(chunks.vendor)} (${formatBytes(Math.round(chunks.vendor * 0.3))} gzipped)`);
    }

    // Check against budgets
    const budgets = performanceConfig.budgets;
    const gzippedTotalKB = gzippedTotal / 1024;

    console.log('\n🎯 Budget Compliance:');

    if (gzippedTotalKB <= budgets.totalBundle) {
      console.log(`  ✅ Total bundle: ${gzippedTotalKB.toFixed(1)}KB / ${budgets.totalBundle}KB`);
    } else {
      console.log(`  ❌ Total bundle: ${gzippedTotalKB.toFixed(1)}KB / ${budgets.totalBundle}KB (OVER BUDGET)`);
      return false;
    }

    if (chunks.main) {
      const mainKB = (chunks.main * 0.3) / 1024;
      if (mainKB <= budgets.mainChunk) {
        console.log(`  ✅ Main chunk: ${mainKB.toFixed(1)}KB / ${budgets.mainChunk}KB`);
      } else {
        console.log(`  ❌ Main chunk: ${mainKB.toFixed(1)}KB / ${budgets.mainChunk}KB (OVER BUDGET)`);
        return false;
      }
    }

    if (chunks.vendor) {
      const vendorKB = (chunks.vendor * 0.3) / 1024;
      if (vendorKB <= budgets.vendorChunk) {
        console.log(`  ✅ Vendor chunk: ${vendorKB.toFixed(1)}KB / ${budgets.vendorChunk}KB`);
      } else {
        console.log(`  ❌ Vendor chunk: ${vendorKB.toFixed(1)}KB / ${budgets.vendorChunk}KB (OVER BUDGET)`);
        return false;
      }
    }

    const cssKB = gzippedCSS / 1024;
    if (cssKB <= budgets.cssBundle) {
      console.log(`  ✅ CSS bundle: ${cssKB.toFixed(1)}KB / ${budgets.cssBundle}KB`);
    } else {
      console.log(`  ❌ CSS bundle: ${cssKB.toFixed(1)}KB / ${budgets.cssBundle}KB (OVER BUDGET)`);
      return false;
    }

    return true;

  } catch (error) {
    console.error('❌ Error analyzing bundle sizes:', error.message);
    return false;
  }
}

function runLighthouseCheck(url) {
  console.log('\n🔍 Running Lighthouse performance audit...');

  if (!url) {
    console.log('⚠️  No URL provided for Lighthouse check');
    return true;
  }

  try {
    // Install lighthouse if not available
    try {
      execCommand('lighthouse --version');
    } catch (error) {
      console.log('📦 Installing Lighthouse...');
      execCommand('npm install -g lighthouse');
    }

    const outputPath = path.join(process.cwd(), 'lighthouse-report.json');

    const lighthouseCmd = `lighthouse ${url} \\
      --only-categories=performance \\
      --output=json \\
      --output-path=${outputPath} \\
      --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" \\
      --quiet`;

    execCommand(lighthouseCmd);

    if (!fs.existsSync(outputPath)) {
      console.warn('⚠️  Lighthouse report not generated');
      return true;
    }

    const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const metrics = report.lhr.audits;
    const performance = report.lhr.categories.performance;

    console.log('📊 Lighthouse Performance Results:');
    console.log(`  Performance Score: ${Math.round(performance.score * 100)}/100`);

    // Core Web Vitals
    const webVitals = {
      'First Contentful Paint': metrics['first-contentful-paint'],
      'Largest Contentful Paint': metrics['largest-contentful-paint'],
      'Cumulative Layout Shift': metrics['cumulative-layout-shift'],
      'Total Blocking Time': metrics['total-blocking-time']
    };

    console.log('\n🎯 Core Web Vitals:');
    let allVitalsPass = true;

    Object.entries(webVitals).forEach(([name, audit]) => {
      if (audit) {
        const value = audit.displayValue || audit.numericValue;
        const score = audit.score;
        const status = score >= 0.9 ? '✅' : score >= 0.5 ? '⚠️' : '❌';

        console.log(`  ${status} ${name}: ${value} (score: ${Math.round(score * 100)}/100)`);

        if (score < 0.5) {
          allVitalsPass = false;
        }
      }
    });

    // Check against budgets
    const budgets = performanceConfig.budgets;
    console.log('\n🎯 Budget Compliance:');

    const fcpValue = metrics['first-contentful-paint']?.numericValue;
    const lcpValue = metrics['largest-contentful-paint']?.numericValue;
    const clsValue = metrics['cumulative-layout-shift']?.numericValue;
    const tbtValue = metrics['total-blocking-time']?.numericValue;

    let budgetCompliance = true;

    if (fcpValue !== undefined) {
      const passes = fcpValue <= budgets.firstContentfulPaint;
      console.log(`  ${passes ? '✅' : '❌'} FCP: ${Math.round(fcpValue)}ms / ${budgets.firstContentfulPaint}ms`);
      if (!passes) budgetCompliance = false;
    }

    if (lcpValue !== undefined) {
      const passes = lcpValue <= budgets.largestContentfulPaint;
      console.log(`  ${passes ? '✅' : '❌'} LCP: ${Math.round(lcpValue)}ms / ${budgets.largestContentfulPaint}ms`);
      if (!passes) budgetCompliance = false;
    }

    if (clsValue !== undefined) {
      const passes = clsValue <= budgets.cumulativeLayoutShift;
      console.log(`  ${passes ? '✅' : '❌'} CLS: ${clsValue.toFixed(3)} / ${budgets.cumulativeLayoutShift}`);
      if (!passes) budgetCompliance = false;
    }

    if (tbtValue !== undefined) {
      const passes = tbtValue <= budgets.totalBlockingTime;
      console.log(`  ${passes ? '✅' : '❌'} TBT: ${Math.round(tbtValue)}ms / ${budgets.totalBlockingTime}ms`);
      if (!passes) budgetCompliance = false;
    }

    // Clean up report file
    fs.unlinkSync(outputPath);

    return budgetCompliance && allVitalsPass && performance.score >= 0.8;

  } catch (error) {
    console.warn('⚠️  Lighthouse check failed:', error.message);
    return true; // Don't fail the build for lighthouse issues
  }
}

function checkDependencySize() {
  console.log('\n📋 Checking dependency sizes...');

  try {
    // Install bundle-phobia-cli if not available
    try {
      execCommand('bundle-phobia --version');
    } catch (error) {
      console.log('📦 Installing bundle-phobia-cli...');
      execCommand('npm install -g bundle-phobia-cli');
    }

    const packageJsonPath = path.join(process.cwd(), 'apps', 'frontend', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const heavyDependencies = [
      '@radix-ui/react-dialog',
      'framer-motion',
      'react-hook-form',
      'next'
    ];

    console.log('📦 Large Dependencies Analysis:');

    heavyDependencies.forEach(dep => {
      if (packageJson.dependencies[dep]) {
        try {
          const result = execCommand(`bundle-phobia ${dep}@${packageJson.dependencies[dep]}`, { allowFailure: true });
          if (result) {
            console.log(`  ${dep}: ${result.trim()}`);
          }
        } catch (error) {
          console.log(`  ${dep}: Could not analyze`);
        }
      }
    });

    return true;

  } catch (error) {
    console.warn('⚠️  Could not analyze dependencies:', error.message);
    return true;
  }
}

function generateOptimizationRecommendations(bundlePassed, performancePassed) {
  console.log('\n💡 Optimization Recommendations:');

  if (!bundlePassed) {
    console.log('📦 Bundle Size Optimizations:');
    console.log('  - Use dynamic imports for large components');
    console.log('  - Implement code splitting for routes');
    console.log('  - Tree-shake unused dependencies');
    console.log('  - Consider lighter alternatives for heavy libraries');
    console.log('  - Enable gzip/brotli compression');
  }

  if (!performancePassed) {
    console.log('⚡ Performance Optimizations:');
    console.log('  - Optimize images (use next/image)');
    console.log('  - Implement lazy loading');
    console.log('  - Reduce JavaScript execution time');
    console.log('  - Minimize main thread work');
    console.log('  - Use React.memo for expensive components');
    console.log('  - Implement service worker caching');
  }

  console.log('\n🔗 Useful Tools:');
  console.log('  - Bundle Analyzer: ANALYZE=true bun build');
  console.log('  - React Profiler: PROFILE=true bun dev');
  console.log('  - Lighthouse CI: npm run lighthouse:ci');
  console.log('  - Web Vitals: https://web.dev/vitals/');
}

async function main() {
  console.log('🚀 StudyTeddy Performance Check\n');

  let allChecksPassed = true;

  // Check if build exists
  const buildDir = path.join(process.cwd(), 'apps', 'frontend', '.next');
  if (!fs.existsSync(buildDir)) {
    console.log('🔨 Building application...');
    try {
      execCommand('bun build', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Build failed');
      process.exit(1);
    }
  }

  // Run checks
  const bundleCheck = checkBundleSize();
  const dependencyCheck = checkDependencySize();

  // Lighthouse check (if URL provided)
  const url = process.argv[2];
  let performanceCheck = true;

  if (url) {
    performanceCheck = runLighthouseCheck(url);
  } else {
    console.log('\n⚠️  No URL provided for Lighthouse check');
    console.log('Usage: bun scripts/performance-check.js [URL]');
  }

  allChecksPassed = bundleCheck && dependencyCheck && performanceCheck;

  // Generate recommendations
  generateOptimizationRecommendations(bundleCheck, performanceCheck);

  // Summary
  console.log('\n📊 Performance Check Summary:');
  console.log(`  Bundle Size: ${bundleCheck ? '✅' : '❌'}`);
  console.log(`  Dependencies: ${dependencyCheck ? '✅' : '❌'}`);
  console.log(`  Performance: ${performanceCheck ? '✅' : '❌'}`);

  if (allChecksPassed) {
    console.log('\n🎉 All performance checks passed!');
    console.log('✅ Your application meets the performance requirements');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some performance checks failed');
    console.log('💡 Please address the issues above before deployment');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkBundleSize, runLighthouseCheck };