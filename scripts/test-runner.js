#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      suites: {},
      summary: {
        totalSuites: 0,
        passedSuites: 0,
        failedSuites: 0,
        totalDuration: 0,
        errors: []
      }
    };
  }

  async runAllTests(options = {}) {
    console.log('🚀 Starting comprehensive test suite...\n');

    const testSuites = [
      {
        name: 'Unit Tests',
        command: 'bun test',
        required: true,
        description: 'Running unit tests'
      },
      {
        name: 'Type Checking',
        command: 'bun run typecheck',
        required: true,
        description: 'Checking TypeScript types'
      },
      {
        name: 'Linting',
        command: 'bun run lint',
        required: true,
        description: 'Running ESLint checks'
      },
      {
        name: 'E2E Tests - Chrome',
        command: 'bun run test:e2e:chrome',
        required: false,
        description: 'Running E2E tests in Chrome'
      },
      {
        name: 'E2E Tests - Firefox',
        command: 'bun run test:e2e:firefox',
        required: false,
        description: 'Running E2E tests in Firefox'
      },
      {
        name: 'E2E Tests - Safari',
        command: 'bun run test:e2e:safari',
        required: false,
        description: 'Running E2E tests in Safari'
      },
      {
        name: 'Mobile Tests',
        command: 'bun run test:e2e:mobile',
        required: false,
        description: 'Running mobile browser tests'
      },
      {
        name: 'Visual Regression',
        command: 'bun run test:visual',
        required: false,
        description: 'Running visual regression tests'
      },
      {
        name: 'Accessibility',
        command: 'playwright test tests/accessibility/',
        required: false,
        description: 'Running accessibility tests'
      },
      {
        name: 'Performance - Core Web Vitals',
        command: 'playwright test tests/performance/core-web-vitals.spec.ts',
        required: false,
        description: 'Running Core Web Vitals tests'
      },
      {
        name: 'Bundle Size Check',
        command: 'bun run test:bundle-size',
        required: false,
        description: 'Checking bundle size limits'
      },
      {
        name: 'Performance Budget',
        command: 'bun run test:performance-budget',
        required: false,
        description: 'Checking performance budgets'
      }
    ];

    // Filter test suites based on options
    let suitesToRun = testSuites;

    if (options.only) {
      suitesToRun = testSuites.filter(suite =>
        options.only.some(pattern =>
          suite.name.toLowerCase().includes(pattern.toLowerCase())
        )
      );
    }

    if (options.skip) {
      suitesToRun = suitesToRun.filter(suite =>
        !options.skip.some(pattern =>
          suite.name.toLowerCase().includes(pattern.toLowerCase())
        )
      );
    }

    if (options.fast) {
      // Run only essential tests in fast mode
      suitesToRun = suitesToRun.filter(suite => suite.required);
    }

    console.log(`Running ${suitesToRun.length} test suite(s):\n`);

    // Run test suites
    for (const suite of suitesToRun) {
      await this.runTestSuite(suite, options);
    }

    // Generate final report
    await this.generateReport(options);

    return this.results.summary.failedSuites === 0;
  }

  async runTestSuite(suite, options = {}) {
    console.log(`📋 ${suite.description}...`);

    const startTime = Date.now();
    let success = false;
    let output = '';
    let error = null;

    try {
      if (options.dryRun) {
        console.log(`   Would run: ${suite.command}`);
        output = 'Dry run - command not executed';
        success = true;
      } else {
        output = execSync(suite.command, {
          encoding: 'utf8',
          timeout: 300000, // 5 minutes timeout
          stdio: options.verbose ? 'inherit' : 'pipe'
        });
        success = true;
      }
    } catch (err) {
      success = false;
      error = err.message;
      output = err.stdout || err.message;

      if (!suite.required && options.continueOnError !== false) {
        console.log(`   ⚠️  ${suite.name} failed (non-critical)`);
      } else {
        console.log(`   ❌ ${suite.name} failed`);
      }
    }

    const duration = Date.now() - startTime;

    // Record results
    this.results.suites[suite.name] = {
      command: suite.command,
      success,
      duration,
      required: suite.required,
      output: options.verbose ? output : output.slice(-1000), // Keep last 1000 chars
      error
    };

    this.results.summary.totalSuites++;
    this.results.summary.totalDuration += duration;

    if (success) {
      this.results.summary.passedSuites++;
      console.log(`   ✅ ${suite.name} passed (${duration}ms)`);
    } else {
      this.results.summary.failedSuites++;
      this.results.summary.errors.push({
        suite: suite.name,
        error: error,
        required: suite.required
      });

      if (suite.required && !options.continueOnError) {
        throw new Error(`Required test suite failed: ${suite.name}`);
      }
    }

    console.log('');
  }

  async generateReport(options = {}) {
    console.log('📊 Test Results Summary');
    console.log('========================');
    console.log(`Total Suites: ${this.results.summary.totalSuites}`);
    console.log(`Passed: ${this.results.summary.passedSuites}`);
    console.log(`Failed: ${this.results.summary.failedSuites}`);
    console.log(`Total Duration: ${Math.round(this.results.summary.totalDuration / 1000)}s`);

    if (this.results.summary.failedSuites > 0) {
      console.log('\n❌ Failed Suites:');
      this.results.summary.errors.forEach(error => {
        const indicator = error.required ? '🔴' : '🟡';
        console.log(`   ${indicator} ${error.suite}${error.required ? ' (REQUIRED)' : ''}`);
        if (error.error && options.verbose) {
          console.log(`      Error: ${error.error.slice(0, 200)}...`);
        }
      });
    }

    // Generate detailed reports
    await this.saveDetailedReport();

    if (options.generateHtml) {
      await this.generateHtmlReport();
    }

    // Health check
    const criticalFailures = this.results.summary.errors.filter(e => e.required).length;
    const passRate = (this.results.summary.passedSuites / this.results.summary.totalSuites * 100).toFixed(1);

    console.log(`\n📈 Pass Rate: ${passRate}%`);

    if (criticalFailures === 0) {
      console.log('✅ All critical tests passed!');
    } else {
      console.log(`🚨 ${criticalFailures} critical test suite(s) failed!`);
    }

    // Performance insights
    const slowestSuite = Object.entries(this.results.suites)
      .sort(([,a], [,b]) => b.duration - a.duration)[0];

    if (slowestSuite) {
      console.log(`🐌 Slowest suite: ${slowestSuite[0]} (${slowestSuite[1].duration}ms)`);
    }
  }

  async saveDetailedReport() {
    const reportPath = path.join(process.cwd(), 'test-results-detailed.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
  }

  async generateHtmlReport() {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Results - Study Teddy</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .summary-card.success { border-left: 4px solid #28a745; }
        .summary-card.warning { border-left: 4px solid #ffc107; }
        .summary-card.danger { border-left: 4px solid #dc3545; }
        .suite { margin: 20px 0; padding: 15px; border-radius: 6px; }
        .suite.success { background: #d4edda; border-left: 4px solid #28a745; }
        .suite.failure { background: #f8d7da; border-left: 4px solid #dc3545; }
        .suite h3 { margin: 0 0 10px 0; }
        .suite .meta { font-size: 14px; color: #666; margin: 5px 0; }
        .suite .output { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-top: 10px; max-height: 200px; overflow-y: auto; }
        .error { color: #dc3545; }
        .success-rate { font-size: 24px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Results Report</h1>
            <p>Generated: ${new Date(this.results.timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Suites</h3>
                <div class="success-rate">${this.results.summary.totalSuites}</div>
            </div>
            <div class="summary-card success">
                <h3>Passed</h3>
                <div class="success-rate">${this.results.summary.passedSuites}</div>
            </div>
            <div class="summary-card ${this.results.summary.failedSuites > 0 ? 'danger' : 'success'}">
                <h3>Failed</h3>
                <div class="success-rate">${this.results.summary.failedSuites}</div>
            </div>
            <div class="summary-card">
                <h3>Duration</h3>
                <div class="success-rate">${Math.round(this.results.summary.totalDuration / 1000)}s</div>
            </div>
            <div class="summary-card">
                <h3>Pass Rate</h3>
                <div class="success-rate">${(this.results.summary.passedSuites / this.results.summary.totalSuites * 100).toFixed(1)}%</div>
            </div>
        </div>

        <h2>Test Suite Results</h2>
        ${Object.entries(this.results.suites).map(([name, result]) => `
            <div class="suite ${result.success ? 'success' : 'failure'}">
                <h3>${name} ${result.success ? '✅' : '❌'}</h3>
                <div class="meta">
                    <strong>Command:</strong> <code>${result.command}</code><br>
                    <strong>Duration:</strong> ${result.duration}ms<br>
                    <strong>Required:</strong> ${result.required ? 'Yes' : 'No'}
                </div>
                ${result.error ? `<div class="error"><strong>Error:</strong> ${result.error}</div>` : ''}
                ${result.output ? `<div class="output">${result.output}</div>` : ''}
            </div>
        `).join('')}

        ${this.results.summary.errors.length > 0 ? `
            <h2>Failed Suites Summary</h2>
            <ul>
                ${this.results.summary.errors.map(error => `
                    <li class="${error.required ? 'error' : ''}">
                        <strong>${error.suite}</strong>${error.required ? ' (REQUIRED)' : ''}
                        ${error.error ? `<br><small>${error.error}</small>` : ''}
                    </li>
                `).join('')}
            </ul>
        ` : '<h2>🎉 All tests passed!</h2>'}
    </div>
</body>
</html>
    `;

    const htmlPath = path.join(process.cwd(), 'test-results.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`📄 HTML report saved: ${htmlPath}`);
  }
}

// CLI interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    fast: false,
    verbose: false,
    dryRun: false,
    continueOnError: true,
    generateHtml: false,
    only: [],
    skip: []
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--fast':
        options.fast = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--fail-fast':
        options.continueOnError = false;
        break;
      case '--html':
        options.generateHtml = true;
        break;
      case '--only':
        options.only = args[++i]?.split(',') || [];
        break;
      case '--skip':
        options.skip = args[++i]?.split(',') || [];
        break;
      case '--help':
        console.log(`
Usage: node test-runner.js [options]

Options:
  --fast              Run only essential tests
  --verbose           Show detailed output
  --dry-run           Show what would be run without executing
  --fail-fast         Stop on first failure
  --html              Generate HTML report
  --only <patterns>   Run only tests matching patterns (comma-separated)
  --skip <patterns>   Skip tests matching patterns (comma-separated)
  --help              Show this help message

Examples:
  node test-runner.js --fast
  node test-runner.js --only e2e,visual
  node test-runner.js --skip performance --html
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Run the test runner
async function main() {
  try {
    const options = parseArgs();
    const runner = new TestRunner();
    const success = await runner.runAllTests(options);

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TestRunner;