#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BundleAnalyzer {
  constructor() {
    this.buildPath = path.join(process.cwd(), 'apps/frontend/.next');
    this.reportPath = path.join(process.cwd(), 'bundle-analysis-report.json');
    this.analysis = {
      timestamp: new Date().toISOString(),
      totalSize: 0,
      gzippedSize: 0,
      files: [],
      chunks: {},
      recommendations: []
    };
  }

  async analyze() {
    console.log('📊 Starting Bundle Analysis...\n');

    if (!this.buildExists()) {
      console.log('⚠️  Build not found. Creating production build...');
      await this.createBuild();
    }

    await this.analyzeStaticAssets();
    await this.analyzeChunks();
    await this.generateRecommendations();
    await this.generateReport();

    return this.analysis;
  }

  buildExists() {
    return fs.existsSync(this.buildPath);
  }

  async createBuild() {
    try {
      execSync('bun run build', { stdio: 'inherit', cwd: process.cwd() });
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  async analyzeStaticAssets() {
    console.log('📦 Analyzing static assets...');

    const staticPath = path.join(this.buildPath, 'static');
    if (!fs.existsSync(staticPath)) {
      throw new Error('Static assets directory not found');
    }

    // Analyze JavaScript files
    await this.analyzeJavaScriptFiles(staticPath);

    // Analyze CSS files
    await this.analyzeCSSFiles(staticPath);

    // Analyze other assets
    await this.analyzeOtherAssets(staticPath);
  }

  async analyzeJavaScriptFiles(staticPath) {
    const jsPath = path.join(staticPath, 'chunks');
    if (!fs.existsSync(jsPath)) return;

    const files = fs.readdirSync(jsPath, { recursive: true });
    let totalJSSize = 0;

    console.log('  JavaScript Files:');

    files.forEach(file => {
      if (typeof file === 'string' && file.endsWith('.js')) {
        const filePath = path.join(jsPath, file);
        const stats = fs.statSync(filePath);
        const sizeKB = Math.round(stats.size / 1024);

        totalJSSize += sizeKB;

        const fileInfo = {
          name: file,
          path: filePath,
          size: stats.size,
          sizeKB: sizeKB,
          type: 'javascript',
          category: this.categorizeJSFile(file)
        };

        this.analysis.files.push(fileInfo);

        console.log(`    📄 ${file}: ${sizeKB} KB (${fileInfo.category})`);
      }
    });

    this.analysis.chunks.javascript = {
      totalFiles: this.analysis.files.filter(f => f.type === 'javascript').length,
      totalSize: totalJSSize
    };

    console.log(`  📊 Total JavaScript: ${totalJSSize} KB\n`);
  }

  async analyzeCSSFiles(staticPath) {
    const cssPath = path.join(staticPath, 'css');
    if (!fs.existsSync(cssPath)) return;

    const files = fs.readdirSync(cssPath);
    let totalCSSSize = 0;

    console.log('  CSS Files:');

    files.forEach(file => {
      if (file.endsWith('.css')) {
        const filePath = path.join(cssPath, file);
        const stats = fs.statSync(filePath);
        const sizeKB = Math.round(stats.size / 1024);

        totalCSSSize += sizeKB;

        const fileInfo = {
          name: file,
          path: filePath,
          size: stats.size,
          sizeKB: sizeKB,
          type: 'css',
          category: 'styles'
        };

        this.analysis.files.push(fileInfo);

        console.log(`    🎨 ${file}: ${sizeKB} KB`);
      }
    });

    this.analysis.chunks.css = {
      totalFiles: this.analysis.files.filter(f => f.type === 'css').length,
      totalSize: totalCSSSize
    };

    console.log(`  📊 Total CSS: ${totalCSSSize} KB\n`);
  }

  async analyzeOtherAssets(staticPath) {
    const mediaPath = path.join(staticPath, 'media');
    if (!fs.existsSync(mediaPath)) return;

    const files = fs.readdirSync(mediaPath);
    let totalMediaSize = 0;

    console.log('  Media Files:');

    files.forEach(file => {
      const filePath = path.join(mediaPath, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);

      totalMediaSize += sizeKB;

      const fileInfo = {
        name: file,
        path: filePath,
        size: stats.size,
        sizeKB: sizeKB,
        type: this.getFileType(file),
        category: 'media'
      };

      this.analysis.files.push(fileInfo);

      console.log(`    🖼️  ${file}: ${sizeKB} KB`);
    });

    this.analysis.chunks.media = {
      totalFiles: this.analysis.files.filter(f => f.category === 'media').length,
      totalSize: totalMediaSize
    };

    console.log(`  📊 Total Media: ${totalMediaSize} KB\n`);
  }

  categorizeJSFile(filename) {
    if (filename.includes('framework')) return 'framework';
    if (filename.includes('main')) return 'main';
    if (filename.includes('pages')) return 'pages';
    if (filename.includes('chunks')) return 'chunks';
    if (filename.includes('polyfills')) return 'polyfills';
    if (filename.includes('webpack')) return 'webpack';
    return 'other';
  }

  getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const imageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
    const fontTypes = ['.woff', '.woff2', '.ttf', '.eot'];

    if (imageTypes.includes(ext)) return 'image';
    if (fontTypes.includes(ext)) return 'font';
    if (ext === '.css') return 'css';
    if (ext === '.js') return 'javascript';
    return 'other';
  }

  async analyzeChunks() {
    console.log('🔍 Analyzing chunk composition...');

    // Group files by category
    const categories = {};
    this.analysis.files.forEach(file => {
      if (!categories[file.category]) {
        categories[file.category] = {
          files: [],
          totalSize: 0,
          count: 0
        };
      }
      categories[file.category].files.push(file);
      categories[file.category].totalSize += file.sizeKB;
      categories[file.category].count++;
    });

    this.analysis.chunks.byCategory = categories;

    // Calculate total size
    this.analysis.totalSize = this.analysis.files.reduce((sum, file) => sum + file.sizeKB, 0);

    console.log('  Chunk Summary:');
    Object.entries(categories).forEach(([category, data]) => {
      console.log(`    ${category}: ${data.count} files, ${data.totalSize} KB`);
    });

    console.log(`\n  📊 Total Bundle Size: ${this.analysis.totalSize} KB`);
  }

  async generateRecommendations() {
    console.log('\n💡 Generating Optimization Recommendations...');

    const recommendations = [];

    // Large file recommendations
    const largeFiles = this.analysis.files
      .filter(file => file.sizeKB > 100)
      .sort((a, b) => b.sizeKB - a.sizeKB);

    if (largeFiles.length > 0) {
      recommendations.push({
        type: 'large-files',
        priority: 'high',
        title: 'Large Files Detected',
        description: `Found ${largeFiles.length} files larger than 100KB`,
        files: largeFiles.slice(0, 5).map(f => ({ name: f.name, size: f.sizeKB })),
        action: 'Consider code splitting, dynamic imports, or compression'
      });
    }

    // Bundle size recommendations
    const totalSizeMB = this.analysis.totalSize / 1024;
    if (totalSizeMB > 2) {
      recommendations.push({
        type: 'bundle-size',
        priority: 'high',
        title: 'Large Bundle Size',
        description: `Total bundle size is ${totalSizeMB.toFixed(2)} MB`,
        action: 'Implement code splitting and lazy loading'
      });
    }

    // Duplicate dependencies check
    const jsFiles = this.analysis.files.filter(f => f.type === 'javascript');
    const possibleDuplicates = this.findPossibleDuplicates(jsFiles);

    if (possibleDuplicates.length > 0) {
      recommendations.push({
        type: 'duplicates',
        priority: 'medium',
        title: 'Possible Duplicate Dependencies',
        description: `Found ${possibleDuplicates.length} potentially duplicate files`,
        files: possibleDuplicates,
        action: 'Review and deduplicate common dependencies'
      });
    }

    // Image optimization recommendations
    const images = this.analysis.files.filter(f => f.type === 'image');
    const largeImages = images.filter(f => f.sizeKB > 50);

    if (largeImages.length > 0) {
      recommendations.push({
        type: 'image-optimization',
        priority: 'medium',
        title: 'Large Images',
        description: `Found ${largeImages.length} images larger than 50KB`,
        files: largeImages.map(f => ({ name: f.name, size: f.sizeKB })),
        action: 'Optimize images with compression and modern formats (WebP, AVIF)'
      });
    }

    // CSS recommendations
    const css = this.analysis.chunks.css;
    if (css && css.totalSize > 100) {
      recommendations.push({
        type: 'css-optimization',
        priority: 'low',
        title: 'Large CSS Bundle',
        description: `CSS bundle is ${css.totalSize} KB`,
        action: 'Consider CSS purging and critical CSS extraction'
      });
    }

    this.analysis.recommendations = recommendations;

    console.log('  Recommendations:');
    recommendations.forEach((rec, index) => {
      const priorityIcon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`    ${index + 1}. ${priorityIcon} ${rec.title}`);
      console.log(`       ${rec.description}`);
      console.log(`       Action: ${rec.action}\n`);
    });
  }

  findPossibleDuplicates(jsFiles) {
    const nameMap = {};
    jsFiles.forEach(file => {
      // Extract base name without hash
      const baseName = file.name.replace(/-[a-f0-9]{8,}/g, '').replace(/\.[a-f0-9]{8,}\./, '.');
      if (!nameMap[baseName]) {
        nameMap[baseName] = [];
      }
      nameMap[baseName].push(file);
    });

    return Object.entries(nameMap)
      .filter(([_, files]) => files.length > 1)
      .map(([baseName, files]) => ({
        baseName,
        files: files.map(f => ({ name: f.name, size: f.sizeKB }))
      }));
  }

  async generateReport() {
    console.log('\n📄 Generating Bundle Analysis Report...');

    // Save detailed JSON report
    fs.writeFileSync(this.reportPath, JSON.stringify(this.analysis, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport();
    const htmlPath = path.join(process.cwd(), 'bundle-analysis-report.html');
    fs.writeFileSync(htmlPath, htmlReport);

    console.log(`  ✅ JSON Report: ${this.reportPath}`);
    console.log(`  ✅ HTML Report: ${htmlPath}`);

    // Summary
    console.log('\n📊 Bundle Analysis Summary:');
    console.log(`  Total Files: ${this.analysis.files.length}`);
    console.log(`  Total Size: ${this.analysis.totalSize} KB`);
    console.log(`  Recommendations: ${this.analysis.recommendations.length}`);

    const highPriorityRecs = this.analysis.recommendations.filter(r => r.priority === 'high').length;
    if (highPriorityRecs > 0) {
      console.log(`  🔴 High Priority Issues: ${highPriorityRecs}`);
    } else {
      console.log('  ✅ No high priority issues found');
    }
  }

  generateHTMLReport() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bundle Analysis Report - Study Teddy</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1, h2, h3 { color: #333; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #666; font-size: 14px; text-transform: uppercase; }
        .summary-card .value { font-size: 24px; font-weight: bold; color: #333; }
        .files-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .files-table th, .files-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        .files-table th { background: #f8f9fa; font-weight: 600; }
        .category { padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase; }
        .category.framework { background: #e3f2fd; color: #1976d2; }
        .category.main { background: #f3e5f5; color: #7b1fa2; }
        .category.pages { background: #e8f5e8; color: #388e3c; }
        .category.css { background: #fff3e0; color: #f57c00; }
        .recommendation { margin: 15px 0; padding: 15px; border-left: 4px solid #ddd; background: #f8f9fa; }
        .recommendation.high { border-left-color: #f44336; }
        .recommendation.medium { border-left-color: #ff9800; }
        .recommendation.low { border-left-color: #4caf50; }
        .recommendation h4 { margin: 0 0 10px 0; }
        .file-list { font-size: 14px; color: #666; margin: 10px 0; }
        .chart { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Bundle Analysis Report</h1>
        <p><strong>Generated:</strong> ${this.analysis.timestamp}</p>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Files</h3>
                <div class="value">${this.analysis.files.length}</div>
            </div>
            <div class="summary-card">
                <h3>Total Size</h3>
                <div class="value">${this.analysis.totalSize} KB</div>
            </div>
            <div class="summary-card">
                <h3>JavaScript</h3>
                <div class="value">${this.analysis.chunks.javascript?.totalSize || 0} KB</div>
            </div>
            <div class="summary-card">
                <h3>CSS</h3>
                <div class="value">${this.analysis.chunks.css?.totalSize || 0} KB</div>
            </div>
        </div>

        <h2>File Breakdown</h2>
        <table class="files-table">
            <thead>
                <tr>
                    <th>File</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Size (KB)</th>
                </tr>
            </thead>
            <tbody>
                ${this.analysis.files
                  .sort((a, b) => b.sizeKB - a.sizeKB)
                  .map(file => `
                    <tr>
                        <td>${file.name}</td>
                        <td><span class="category ${file.category}">${file.category}</span></td>
                        <td>${file.type}</td>
                        <td>${file.sizeKB}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>Optimization Recommendations</h2>
        ${this.analysis.recommendations.map(rec => `
            <div class="recommendation ${rec.priority}">
                <h4>${rec.title} (${rec.priority} priority)</h4>
                <p>${rec.description}</p>
                <p><strong>Action:</strong> ${rec.action}</p>
                ${rec.files ? `
                    <div class="file-list">
                        <strong>Affected files:</strong><br>
                        ${rec.files.map(f => `${f.name} (${f.size} KB)`).join('<br>')}
                    </div>
                ` : ''}
            </div>
        `).join('')}

        ${this.analysis.recommendations.length === 0 ? '<p>✅ No optimization recommendations at this time.</p>' : ''}
    </div>
</body>
</html>
    `;
  }
}

// Run bundle analyzer
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  analyzer.analyze().catch(error => {
    console.error('❌ Bundle analysis failed:', error);
    process.exit(1);
  });
}

module.exports = BundleAnalyzer;