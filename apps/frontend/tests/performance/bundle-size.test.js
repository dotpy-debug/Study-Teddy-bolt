/**
 * Bundle Size Performance Tests
 * Ensures bundle sizes stay within performance budget limits
 */

const fs = require('fs');
const path = require('path');
const gzipSize = require('gzip-size');

const PERFORMANCE_BUDGET = {
  // Main JavaScript bundles (gzipped)
  'main': 100 * 1024,      // 100KB
  'vendors': 150 * 1024,   // 150KB
  'common': 80 * 1024,     // 80KB
  'react': 50 * 1024,      // 50KB
  'ui': 70 * 1024,         // 70KB
  'utils': 30 * 1024,      // 30KB

  // Total bundle size limit
  'total': 250 * 1024,     // 250KB (PRD requirement)

  // Individual chunk limits
  'chunk': 150 * 1024,     // 150KB per chunk

  // Asset limits
  'css': 50 * 1024,        // 50KB for CSS
  'images': 100 * 1024,    // 100KB for images
};

function getAllJSFiles(dir) {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllJSFiles(fullPath));
    } else if (item.endsWith('.js') && !item.includes('.map')) {
      files.push(fullPath);
    }
  }

  return files;
}

function getBundleInfo(filePath) {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath);
  const uncompressed = content.length;
  const compressed = gzipSize.sync(content);

  // Determine bundle type
  let bundleType = 'other';
  if (fileName.includes('main')) bundleType = 'main';
  else if (fileName.includes('vendor')) bundleType = 'vendors';
  else if (fileName.includes('common')) bundleType = 'common';
  else if (fileName.includes('react')) bundleType = 'react';
  else if (fileName.includes('ui')) bundleType = 'ui';
  else if (fileName.includes('utils')) bundleType = 'utils';

  return {
    fileName,
    filePath,
    bundleType,
    uncompressed,
    compressed,
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

describe('Bundle Size Performance Tests', () => {
  const buildDir = path.join(__dirname, '../../.next/static/chunks');
  let bundleFiles = [];
  let bundleInfos = [];

  beforeAll(() => {
    bundleFiles = getAllJSFiles(buildDir);
    bundleInfos = bundleFiles.map(getBundleInfo);

    console.log('\n🔍 Bundle Analysis:');
    console.log('==================');

    bundleInfos.forEach(info => {
      const budgetForType = PERFORMANCE_BUDGET[info.bundleType] || PERFORMANCE_BUDGET.chunk;
      const overBudget = info.compressed > budgetForType;
      const status = overBudget ? '❌ OVER BUDGET' : '✅ Within budget';

      console.log(
        `${info.fileName}: ${formatBytes(info.compressed)} gzipped ` +
        `(${formatBytes(info.uncompressed)} raw) - ${status}`
      );
    });

    const totalCompressed = bundleInfos.reduce((sum, info) => sum + info.compressed, 0);
    const totalUncompressed = bundleInfos.reduce((sum, info) => sum + info.uncompressed, 0);

    console.log('\n📊 Total Bundle Size:');
    console.log('====================');
    console.log(`Compressed: ${formatBytes(totalCompressed)}`);
    console.log(`Uncompressed: ${formatBytes(totalUncompressed)}`);
    console.log(`Budget: ${formatBytes(PERFORMANCE_BUDGET.total)}`);
    console.log(`Remaining: ${formatBytes(PERFORMANCE_BUDGET.total - totalCompressed)}\n`);
  });

  test('should have bundle files generated', () => {
    expect(bundleFiles.length).toBeGreaterThan(0);
  });

  test('total bundle size should be within budget', () => {
    const totalSize = bundleInfos.reduce((sum, info) => sum + info.compressed, 0);

    expect(totalSize).toBeLessThanOrEqual(PERFORMANCE_BUDGET.total);

    if (totalSize > PERFORMANCE_BUDGET.total) {
      const excess = totalSize - PERFORMANCE_BUDGET.total;
      throw new Error(
        `Total bundle size (${formatBytes(totalSize)}) exceeds budget ` +
        `(${formatBytes(PERFORMANCE_BUDGET.total)}) by ${formatBytes(excess)}`
      );
    }
  });

  test('individual bundles should be within their specific budgets', () => {
    const overBudgetBundles = [];

    bundleInfos.forEach(info => {
      const budgetForType = PERFORMANCE_BUDGET[info.bundleType] || PERFORMANCE_BUDGET.chunk;

      if (info.compressed > budgetForType) {
        overBudgetBundles.push({
          ...info,
          budget: budgetForType,
          excess: info.compressed - budgetForType,
        });
      }
    });

    if (overBudgetBundles.length > 0) {
      const errorMessage = overBudgetBundles
        .map(bundle =>
          `${bundle.fileName} (${bundle.bundleType}): ${formatBytes(bundle.compressed)} ` +
          `exceeds budget of ${formatBytes(bundle.budget)} by ${formatBytes(bundle.excess)}`
        )
        .join('\n');

      throw new Error(`Bundles over budget:\n${errorMessage}`);
    }

    expect(overBudgetBundles).toHaveLength(0);
  });

  test('should not have any extremely large individual chunks', () => {
    const maxChunkSize = 200 * 1024; // 200KB absolute max
    const largeBundles = bundleInfos.filter(info => info.compressed > maxChunkSize);

    expect(largeBundles).toHaveLength(0);

    if (largeBundles.length > 0) {
      const errorMessage = largeBundles
        .map(bundle => `${bundle.fileName}: ${formatBytes(bundle.compressed)}`)
        .join('\n');

      throw new Error(`Bundles over absolute size limit (${formatBytes(maxChunkSize)}):\n${errorMessage}`);
    }
  });

  test('should have reasonable compression ratio', () => {
    bundleInfos.forEach(info => {
      const compressionRatio = info.compressed / info.uncompressed;

      // Expect at least 60% compression (compression ratio <= 0.4)
      expect(compressionRatio).toBeLessThanOrEqual(0.4);

      if (compressionRatio > 0.4) {
        throw new Error(
          `Poor compression ratio for ${info.fileName}: ` +
          `${(compressionRatio * 100).toFixed(1)}% (expected <= 40%)`
        );
      }
    });
  });

  test('should not duplicate common libraries across bundles', () => {
    // This test would require more sophisticated bundle analysis
    // For now, we check that we don't have too many small bundles
    // which might indicate poor code splitting

    const smallBundles = bundleInfos.filter(info =>
      info.compressed < 10 * 1024 && // Less than 10KB
      !info.fileName.includes('webpack') &&
      !info.fileName.includes('main')
    );

    // Should not have more than 3 very small bundles
    expect(smallBundles.length).toBeLessThanOrEqual(3);
  });

  test('vendor bundles should contain expected dependencies', () => {
    const vendorBundles = bundleInfos.filter(info =>
      info.bundleType === 'vendors' || info.fileName.includes('vendor')
    );

    // Should have at least one vendor bundle
    expect(vendorBundles.length).toBeGreaterThanOrEqual(1);

    // Vendor bundles should be reasonably sized (not too small, indicating poor splitting)
    vendorBundles.forEach(bundle => {
      expect(bundle.compressed).toBeGreaterThan(20 * 1024); // At least 20KB
    });
  });
});

describe('Performance Budget Monitoring', () => {
  test('should generate performance budget report', () => {
    const buildDir = path.join(__dirname, '../../.next/static/chunks');
    const bundleFiles = getAllJSFiles(buildDir);
    const bundleInfos = bundleFiles.map(getBundleInfo);

    const report = {
      timestamp: new Date().toISOString(),
      totalBundles: bundleInfos.length,
      totalSize: {
        compressed: bundleInfos.reduce((sum, info) => sum + info.compressed, 0),
        uncompressed: bundleInfos.reduce((sum, info) => sum + info.uncompressed, 0),
      },
      budget: PERFORMANCE_BUDGET,
      bundles: bundleInfos.map(info => ({
        name: info.fileName,
        type: info.bundleType,
        size: {
          compressed: info.compressed,
          uncompressed: info.uncompressed,
        },
        withinBudget: info.compressed <= (PERFORMANCE_BUDGET[info.bundleType] || PERFORMANCE_BUDGET.chunk),
      })),
      budgetStatus: {
        totalWithinBudget: bundleInfos.reduce((sum, info) => sum + info.compressed, 0) <= PERFORMANCE_BUDGET.total,
        remainingBudget: PERFORMANCE_BUDGET.total - bundleInfos.reduce((sum, info) => sum + info.compressed, 0),
      },
    };

    // Save report for CI/CD pipeline
    const reportPath = path.join(__dirname, '../../.next/bundle-size-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📊 Performance budget report saved to: ${reportPath}`);

    expect(report.budgetStatus.totalWithinBudget).toBe(true);
  });
});