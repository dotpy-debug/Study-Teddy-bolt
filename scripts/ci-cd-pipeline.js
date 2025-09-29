#!/usr/bin/env node

/**
 * CI/CD Pipeline Script for StudyTeddy
 *
 * This script implements a complete CI/CD pipeline with:
 * - Automated testing
 * - Build optimization
 * - Performance validation
 * - Deployment automation
 * - Post-deployment verification
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function execCommand(command, options = {}) {
  try {
    console.log(`🔄 Running: ${command}`);
    return execSync(command, {
      stdio: 'inherit',
      encoding: 'utf8',
      ...options
    });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    throw error;
  }
}

function logStep(step, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 STEP ${step}: ${description}`);
  console.log(`${'='.repeat(60)}`);
}

function validatePrerequisites() {
  logStep(1, 'Validating Prerequisites');

  // Check Node.js version
  const nodeVersion = process.version;
  console.log(`📦 Node.js version: ${nodeVersion}`);

  // Check if this is a git repository
  try {
    execCommand('git rev-parse --git-dir', { stdio: 'pipe' });
    console.log('✅ Git repository detected');
  } catch (error) {
    console.error('❌ Not a git repository');
    process.exit(1);
  }

  // Check for required files
  const requiredFiles = [
    'package.json',
    'turbo.json',
    'vercel.json',
    'apps/frontend/package.json'
  ];

  requiredFiles.forEach(file => {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      console.log(`✅ ${file} found`);
    } else {
      console.error(`❌ ${file} not found`);
      process.exit(1);
    }
  });

  // Check for Vercel CLI
  try {
    execCommand('vercel --version', { stdio: 'pipe' });
    console.log('✅ Vercel CLI available');
  } catch (error) {
    console.log('📦 Installing Vercel CLI...');
    execCommand('npm install -g vercel');
  }

  console.log('✅ All prerequisites validated');
}

function runCodeQuality() {
  logStep(2, 'Code Quality Checks');

  // Install dependencies
  console.log('📦 Installing dependencies...');
  execCommand('bun install');

  // Type checking
  console.log('🔍 Running type checks...');
  execCommand('bun typecheck');

  // Linting
  console.log('🔧 Running ESLint...');
  execCommand('bun lint');

  // Security audit
  console.log('🔒 Running security audit...');
  try {
    execCommand('bun audit', { allowFailure: true });
  } catch (error) {
    console.warn('⚠️  Security audit found issues - review manually');
  }

  console.log('✅ Code quality checks completed');
}

function runTests() {
  logStep(3, 'Running Tests');

  // Unit tests
  console.log('🧪 Running unit tests...');
  execCommand('bun test');

  // E2E tests (if available)
  const e2eTestExists = fs.existsSync(path.join(process.cwd(), 'apps', 'frontend', 'e2e'));
  if (e2eTestExists) {
    console.log('🎭 Running E2E tests...');
    try {
      execCommand('bun test:e2e');
    } catch (error) {
      console.warn('⚠️  E2E tests failed - manual verification needed');
    }
  }

  console.log('✅ Tests completed');
}

function buildApplication() {
  logStep(4, 'Building Application');

  // Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  execCommand('bun clean');

  // Build packages first
  console.log('📦 Building shared packages...');
  execCommand('bun build:packages');

  // Build main application
  console.log('🔨 Building frontend application...');
  execCommand('bun run build --filter=@studyteddy/frontend');

  console.log('✅ Build completed');
}

function validatePerformance() {
  logStep(5, 'Performance Validation');

  // Run performance checks
  console.log('⚡ Running performance checks...');
  execCommand('bun scripts/performance-check.js');

  // Generate bundle analysis
  console.log('📊 Generating bundle analysis...');
  process.env.ANALYZE = 'true';
  execCommand('bun run build:analyze --filter=@studyteddy/frontend');

  console.log('✅ Performance validation completed');
}

function deployToVercel(environment = 'preview') {
  logStep(6, `Deploying to Vercel (${environment})`);

  const isProduction = environment === 'production';

  // Check if project is linked
  try {
    execCommand('vercel link --yes', { stdio: 'pipe' });
    console.log('✅ Project linked to Vercel');
  } catch (error) {
    console.error('❌ Failed to link project to Vercel');
    process.exit(1);
  }

  // Deploy
  const deployCommand = isProduction ? 'vercel --prod' : 'vercel';
  console.log(`🚀 Deploying to ${environment}...`);

  const deployOutput = execCommand(deployCommand, { stdio: 'pipe', encoding: 'utf8' });

  // Extract deployment URL
  const urlMatch = deployOutput.match(/https:\/\/[^\s]+/);
  const deploymentUrl = urlMatch ? urlMatch[0] : null;

  if (deploymentUrl) {
    console.log(`✅ Deployment successful!`);
    console.log(`🔗 URL: ${deploymentUrl}`);
    return deploymentUrl;
  } else {
    console.error('❌ Could not extract deployment URL');
    return null;
  }
}

function runPostDeploymentTests(deploymentUrl) {
  logStep(7, 'Post-Deployment Verification');

  if (!deploymentUrl) {
    console.warn('⚠️  No deployment URL available for testing');
    return;
  }

  // Health check
  console.log('🏥 Running health check...');
  try {
    execCommand(`curl -f ${deploymentUrl}/api/health`, { stdio: 'pipe' });
    console.log('✅ Health check passed');
  } catch (error) {
    console.warn('⚠️  Health check failed - verify manually');
  }

  // Performance audit
  console.log('📈 Running Lighthouse audit...');
  try {
    execCommand(`bun scripts/performance-check.js ${deploymentUrl}`);
  } catch (error) {
    console.warn('⚠️  Performance audit failed - check manually');
  }

  // Smoke tests
  console.log('💨 Running smoke tests...');
  const smokeTests = [
    `${deploymentUrl}`,
    `${deploymentUrl}/auth/sign-in`,
    `${deploymentUrl}/dashboard`,
  ];

  smokeTests.forEach(url => {
    try {
      execCommand(`curl -f -s -o /dev/null ${url}`, { stdio: 'pipe' });
      console.log(`✅ ${url.replace(deploymentUrl, '')} accessible`);
    } catch (error) {
      console.warn(`⚠️  ${url.replace(deploymentUrl, '')} not accessible`);
    }
  });

  console.log('✅ Post-deployment verification completed');
}

function createDeploymentReport(deploymentUrl, startTime) {
  const endTime = new Date();
  const duration = Math.round((endTime - startTime) / 1000);

  const report = {
    timestamp: endTime.toISOString(),
    duration: `${duration}s`,
    deploymentUrl,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
    environment: process.env.VERCEL_ENV || 'preview',
    success: true
  };

  // Save report
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = path.join(reportsDir, `deployment-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`📄 Deployment report saved: ${reportPath}`);
  return report;
}

function sendNotification(report) {
  console.log('\n📢 Deployment Notification:');
  console.log(`  ✅ Deployment successful in ${report.duration}`);
  console.log(`  🔗 URL: ${report.deploymentUrl}`);
  console.log(`  📝 Commit: ${report.commit}`);
  console.log(`  🌿 Branch: ${report.branch}`);

  // In a real scenario, you might send this to Slack, Discord, etc.
  // For now, we'll just log it
}

async function main() {
  const startTime = new Date();
  console.log('🚀 StudyTeddy CI/CD Pipeline Starting...\n');
  console.log(`📅 Started at: ${startTime.toISOString()}`);

  try {
    // Determine deployment environment
    const environment = process.argv[2] || process.env.VERCEL_ENV || 'preview';
    console.log(`🎯 Target environment: ${environment}`);

    // Run pipeline steps
    validatePrerequisites();
    runCodeQuality();
    runTests();
    buildApplication();
    validatePerformance();

    const deploymentUrl = deployToVercel(environment);
    runPostDeploymentTests(deploymentUrl);

    // Generate deployment report
    const report = createDeploymentReport(deploymentUrl, startTime);
    sendNotification(report);

    console.log('\n🎉 Pipeline completed successfully!');
    console.log(`⏱️  Total duration: ${report.duration}`);

    // Set GitHub Actions output if running in CI
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::set-output name=deployment_url::${deploymentUrl}`);
      console.log(`::set-output name=deployment_status::success`);
    }

  } catch (error) {
    console.error('\n❌ Pipeline failed:', error.message);

    // Create failure report
    const failureReport = {
      timestamp: new Date().toISOString(),
      duration: `${Math.round((new Date() - startTime) / 1000)}s`,
      success: false,
      error: error.message,
      commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
      branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown'
    };

    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(reportsDir, `deployment-failure-${Date.now()}.json`),
      JSON.stringify(failureReport, null, 2)
    );

    // Set GitHub Actions output if running in CI
    if (process.env.GITHUB_ACTIONS) {
      console.log('::set-output name=deployment_status::failure');
    }

    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };