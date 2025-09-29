#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class NextJSAuditor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.suggestions = [];
  }

  audit() {
    console.log('🔍 Running Next.js Best Practices Audit for Study Teddy\n');

    this.checkProjectStructure();
    this.checkPerformance();
    this.checkSecurity();
    this.checkAccessibility();
    this.checkSEO();
    this.checkTypeScript();
    this.generateReport();
  }

  checkProjectStructure() {
    console.log('📁 Checking project structure...');

    const requiredDirs = [
      'app',
      'components',
      'lib',
      'hooks',
      'types'
    ];

    const optionalDirs = [
      'middleware.ts',
      'next.config.ts',
      'tailwind.config.js'
    ];

    for (const dir of requiredDirs) {
      if (!fs.existsSync(path.join(process.cwd(), dir))) {
        this.issues.push(`Missing required directory: ${dir}`);
      }
    }

    for (const file of optionalDirs) {
      if (!fs.existsSync(path.join(process.cwd(), file))) {
        this.warnings.push(`Consider adding: ${file}`);
      }
    }

    // Check for proper component organization
    const componentsPath = path.join(process.cwd(), 'components');
    if (fs.existsSync(componentsPath)) {
      const hasUIDir = fs.existsSync(path.join(componentsPath, 'ui'));
      if (!hasUIDir) {
        this.suggestions.push('Consider organizing components into ui/, features/, and layout/ directories');
      }
    }
  }

  checkPerformance() {
    console.log('⚡ Checking performance optimizations...');

    // Check for next.config.js optimizations
    const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
    if (fs.existsSync(nextConfigPath)) {
      const config = fs.readFileSync(nextConfigPath, 'utf8');

      if (!config.includes('experimental')) {
        this.suggestions.push('Consider adding experimental optimizations to next.config.ts');
      }

      if (!config.includes('images')) {
        this.warnings.push('Consider configuring image optimization in next.config.ts');
      }

      if (!config.includes('swcMinify')) {
        this.suggestions.push('Enable SWC minification for better performance');
      }
    }

    // Check for dynamic imports
    const pagesWithDynamicImports = this.findFilesWithPattern('dynamic\\(');
    if (pagesWithDynamicImports.length === 0) {
      this.suggestions.push('Consider using dynamic imports for code splitting');
    }

    // Check for loading states
    const loadingComponents = this.findFilesWithPattern('loading');
    if (loadingComponents.length < 3) {
      this.suggestions.push('Add more loading states for better UX');
    }
  }

  checkSecurity() {
    console.log('🔒 Checking security best practices...');

    // Check for security headers
    const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
    if (fs.existsSync(nextConfigPath)) {
      const config = fs.readFileSync(nextConfigPath, 'utf8');

      if (!config.includes('headers()')) {
        this.warnings.push('Consider adding security headers in next.config.ts');
      }
    }

    // Check for environment variables
    const envFiles = ['.env.local', '.env', '.env.example'];
    const hasEnvFile = envFiles.some(file => fs.existsSync(path.join(process.cwd(), file)));

    if (!hasEnvFile) {
      this.warnings.push('No environment configuration files found');
    }

    // Check for exposed API keys
    const files = this.getAllFiles();
    files.forEach(file => {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('process.env.') && !content.includes('NEXT_PUBLIC_')) {
          const relativePath = path.relative(process.cwd(), file);
          this.warnings.push(`Potential server-side env var usage in client component: ${relativePath}`);
        }
      }
    });
  }

  checkAccessibility() {
    console.log('♿ Checking accessibility...');

    // Check for semantic HTML usage
    const components = this.findFilesWithPattern('<div');
    const semanticComponents = this.findFilesWithPattern('<main|<nav|<header|<footer|<section|<article');

    if (semanticComponents.length < components.length * 0.3) {
      this.suggestions.push('Use more semantic HTML elements (main, nav, header, footer, section, article)');
    }

    // Check for alt attributes
    const imagesWithoutAlt = this.findFilesWithPattern('<img(?![^>]*alt=)');
    if (imagesWithoutAlt.length > 0) {
      this.issues.push('Found images without alt attributes');
    }

    // Check for ARIA labels
    const ariaLabels = this.findFilesWithPattern('aria-label|aria-labelledby|aria-describedby');
    if (ariaLabels.length < 5) {
      this.suggestions.push('Consider adding more ARIA labels for better accessibility');
    }
  }

  checkSEO() {
    console.log('🎯 Checking SEO optimizations...');

    // Check for metadata
    const metadataFiles = this.findFilesWithPattern('metadata|Metadata');
    if (metadataFiles.length < 3) {
      this.suggestions.push('Add metadata to more pages for better SEO');
    }

    // Check for structured data
    const structuredData = this.findFilesWithPattern('application/ld\\+json');
    if (structuredData.length === 0) {
      this.suggestions.push('Consider adding structured data for better SEO');
    }

    // Check for robots.txt
    if (!fs.existsSync(path.join(process.cwd(), 'public', 'robots.txt'))) {
      this.suggestions.push('Add robots.txt file');
    }

    // Check for sitemap
    if (!fs.existsSync(path.join(process.cwd(), 'public', 'sitemap.xml'))) {
      this.suggestions.push('Consider generating a sitemap');
    }
  }

  checkTypeScript() {
    console.log('📝 Checking TypeScript usage...');

    // Check for any types
    const anyUsage = this.findFilesWithPattern(': any|as any');
    if (anyUsage.length > 5) {
      this.warnings.push(`Found ${anyUsage.length} uses of 'any' type - consider using specific types`);
    }

    // Check for proper interface definitions
    const interfaces = this.findFilesWithPattern('interface ');
    const components = this.findFilesWithPattern('export (function|const)');

    if (interfaces.length < components.length * 0.5) {
      this.suggestions.push('Define more TypeScript interfaces for better type safety');
    }
  }

  findFilesWithPattern(pattern) {
    const files = this.getAllFiles();
    const regex = new RegExp(pattern, 'i');
    const matches = [];

    files.forEach(file => {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          if (regex.test(content)) {
            matches.push(file);
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    });

    return matches;
  }

  getAllFiles(dir = process.cwd(), files = []) {
    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);

      // Skip node_modules and .next
      if (item === 'node_modules' || item === '.next' || item.startsWith('.')) {
        continue;
      }

      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        this.getAllFiles(fullPath, files);
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  generateReport() {
    console.log('\n📊 Audit Report');
    console.log('================\n');

    if (this.issues.length > 0) {
      console.log('🚨 Issues (Must Fix):');
      this.issues.forEach(issue => console.log(`  • ${issue}`));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  Warnings (Should Fix):');
      this.warnings.forEach(warning => console.log(`  • ${warning}`));
      console.log('');
    }

    if (this.suggestions.length > 0) {
      console.log('💡 Suggestions (Consider):');
      this.suggestions.forEach(suggestion => console.log(`  • ${suggestion}`));
      console.log('');
    }

    // Generate score
    const totalChecks = this.issues.length + this.warnings.length + this.suggestions.length;
    const score = Math.max(0, 100 - (this.issues.length * 10) - (this.warnings.length * 5) - (this.suggestions.length * 2));

    console.log(`📈 Overall Score: ${score}/100`);

    if (score >= 90) {
      console.log('🎉 Excellent! Your Next.js app follows best practices.');
    } else if (score >= 70) {
      console.log('👍 Good! Consider addressing the suggestions above.');
    } else if (score >= 50) {
      console.log('⚡ Needs improvement. Focus on fixing issues and warnings.');
    } else {
      console.log('🔧 Significant improvements needed. Start with the issues.');
    }

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      score,
      issues: this.issues,
      warnings: this.warnings,
      suggestions: this.suggestions
    };

    const reportPath = path.join(process.cwd(), '.next-agent', 'audit-report.json');
    if (!fs.existsSync(path.dirname(reportPath))) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

if (require.main === module) {
  const auditor = new NextJSAuditor();
  auditor.audit();
}

module.exports = NextJSAuditor;