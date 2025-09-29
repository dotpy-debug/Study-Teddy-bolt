#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const MAX_BUNDLE_SIZE = 250 * 1024; // 250KB in bytes
const WARN_BUNDLE_SIZE = 200 * 1024; // 200KB warning threshold

function formatBytes(bytes) {
  return (bytes / 1024).toFixed(2) + 'KB';
}

function checkBundleSize() {
  const buildManifestPath = path.join(__dirname, '..', '.next', 'build-manifest.json');
  const appBuildManifestPath = path.join(__dirname, '..', '.next', 'app-build-manifest.json');

  if (!fs.existsSync(buildManifestPath)) {
    console.error('❌ Build manifest not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Check static chunks
  const chunksDir = path.join(__dirname, '..', '.next', 'static', 'chunks');
  if (!fs.existsSync(chunksDir)) {
    console.error('❌ Build chunks not found. Run "npm run build" first.');
    process.exit(1);
  }

  let totalSize = 0;
  const chunkSizes = [];

  // Calculate main chunks size
  const files = fs.readdirSync(chunksDir);
  files.forEach(file => {
    if (file.endsWith('.js') && !file.includes('.map')) {
      const filePath = path.join(chunksDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
      chunkSizes.push({
        name: file,
        size: stats.size
      });
    }
  });

  // Sort by size
  chunkSizes.sort((a, b) => b.size - a.size);

  console.log('📊 Bundle Size Analysis');
  console.log('========================\n');

  // Show top 10 chunks
  console.log('Top 10 Chunks:');
  chunkSizes.slice(0, 10).forEach(chunk => {
    const emoji = chunk.size > 100 * 1024 ? '⚠️' : '✅';
    console.log(`${emoji} ${chunk.name.padEnd(40)} ${formatBytes(chunk.size)}`);
  });

  console.log('\n------------------------');
  console.log(`📦 Total Bundle Size: ${formatBytes(totalSize)}`);
  console.log(`🎯 Target Size: ${formatBytes(MAX_BUNDLE_SIZE)}`);
  console.log('------------------------\n');

  // Check against limits
  if (totalSize > MAX_BUNDLE_SIZE) {
    console.error(`❌ Bundle size (${formatBytes(totalSize)}) exceeds maximum (${formatBytes(MAX_BUNDLE_SIZE)})`);
    console.error(`📉 Need to reduce by ${formatBytes(totalSize - MAX_BUNDLE_SIZE)}`);

    // Provide suggestions
    console.log('\n💡 Suggestions to reduce bundle size:');
    console.log('1. Check for duplicate dependencies');
    console.log('2. Use dynamic imports for heavy components');
    console.log('3. Remove unused dependencies from package.json');
    console.log('4. Enable tree shaking in webpack config');
    console.log('5. Use production builds (NODE_ENV=production)');

    process.exit(1);
  } else if (totalSize > WARN_BUNDLE_SIZE) {
    console.warn(`⚠️  Bundle size (${formatBytes(totalSize)}) is approaching limit`);
    console.log(`📊 ${formatBytes(MAX_BUNDLE_SIZE - totalSize)} remaining before limit`);
  } else {
    console.log(`✅ Bundle size (${formatBytes(totalSize)}) is within limits!`);
    console.log(`🎉 ${formatBytes(MAX_BUNDLE_SIZE - totalSize)} under budget`);
  }

  // Additional metrics
  console.log('\n📈 Optimization Metrics:');
  const avgChunkSize = totalSize / chunkSizes.length;
  console.log(`   Average chunk size: ${formatBytes(avgChunkSize)}`);
  console.log(`   Number of chunks: ${chunkSizes.length}`);
  console.log(`   Largest chunk: ${formatBytes(chunkSizes[0]?.size || 0)}`);
  console.log(`   Smallest chunk: ${formatBytes(chunkSizes[chunkSizes.length - 1]?.size || 0)}`);

  return totalSize <= MAX_BUNDLE_SIZE ? 0 : 1;
}

// Run the check
const exitCode = checkBundleSize();
process.exit(exitCode);