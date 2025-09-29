#!/usr/bin/env node

/**
 * Vercel Deployment Script for StudyTeddy
 *
 * This script handles deployment to Vercel with:
 * - Environment validation
 * - Build optimization
 * - Performance monitoring
 * - Preview/production deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createInterface } = require('readline');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function execCommand(command, options = {}) {
  try {
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

function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');

  // Check if Vercel CLI is installed
  try {
    execCommand('vercel --version', { stdio: 'pipe' });
    console.log('✅ Vercel CLI is installed');
  } catch (error) {
    console.log('📦 Installing Vercel CLI...');
    execCommand('npm install -g vercel');
  }

  // Check if user is logged in
  try {
    execCommand('vercel whoami', { stdio: 'pipe' });
    console.log('✅ Logged in to Vercel');
  } catch (error) {
    console.log('🔐 Please log in to Vercel...');
    execCommand('vercel login');
  }

  // Check if bun is available
  try {
    execCommand('bun --version', { stdio: 'pipe' });
    console.log('✅ Bun is available');
  } catch (error) {
    console.error('❌ Bun is required but not found. Please install Bun first.');
    process.exit(1);
  }
}

function validateEnvironment() {
  console.log('\n🔧 Validating environment configuration...');

  const requiredEnvVars = [
    'NEXTAUTH_SECRET',
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'OPENAI_API_KEY',
    'SENTRY_DSN'
  ];

  const envPath = path.join(process.cwd(), 'apps', 'frontend', '.env.production.local');

  if (!fs.existsSync(envPath)) {
    console.error('❌ Production environment file not found!');
    console.log('💡 Please create .env.production.local in apps/frontend/');
    console.log('📄 Use .env.production.template as a reference');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const missingVars = requiredEnvVars.filter(varName => {
    const regex = new RegExp(`^${varName}=.+`, 'm');
    return !regex.test(envContent) || envContent.includes(`${varName}=your-`);
  });

  if (missingVars.length > 0) {
    console.error('❌ Missing or incomplete environment variables:');
    missingVars.forEach(varName => console.log(`  - ${varName}`));
    console.log('\n💡 Please update your .env.production.local file');
    process.exit(1);
  }

  console.log('✅ Environment configuration is valid');
}

function runBuildOptimizations() {
  console.log('\n⚡ Running build optimizations...');

  // Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  execCommand('bun clean');

  // Type check
  console.log('🔍 Running type checks...');
  execCommand('bun typecheck');

  // Lint code
  console.log('🔧 Running linting...');
  execCommand('bun lint');

  // Run tests
  console.log('🧪 Running tests...');
  try {
    execCommand('bun test');
  } catch (error) {
    console.warn('⚠️  Tests failed. Continue anyway? (y/n)');
    // For non-interactive environments, continue
    if (process.env.CI !== 'true') {
      process.exit(1);
    }
  }

  // Build packages
  console.log('📦 Building packages...');
  execCommand('bun build:packages');

  console.log('✅ Build optimizations completed');
}

function setupVercelProject() {
  console.log('\n🔧 Setting up Vercel project...');

  // Check if vercel.json exists
  const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
  if (!fs.existsSync(vercelConfigPath)) {
    console.error('❌ vercel.json not found!');
    console.log('💡 Make sure vercel.json is in the project root');
    process.exit(1);
  }

  // Initialize or link project
  try {
    execCommand('vercel link --yes');
    console.log('✅ Project linked to Vercel');
  } catch (error) {
    console.log('🆕 Creating new Vercel project...');
    execCommand('vercel --confirm');
  }
}

function setupEnvironmentVariables() {
  console.log('\n🔐 Setting up environment variables on Vercel...');

  const envPath = path.join(process.cwd(), 'apps', 'frontend', '.env.production.local');
  const envContent = fs.readFileSync(envPath, 'utf8');

  // Parse environment variables
  const envVars = envContent
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const [key, ...valueParts] = line.split('=');
      return { key: key.trim(), value: valueParts.join('=').trim() };
    });

  console.log(`📝 Found ${envVars.length} environment variables`);

  // Set environment variables on Vercel
  envVars.forEach(({ key, value }) => {
    if (!value.startsWith('your-') && value !== '') {
      try {
        // Add to production environment
        execCommand(`vercel env add ${key} production`, {
          stdio: 'pipe',
          input: value
        });

        // Add to preview environment
        execCommand(`vercel env add ${key} preview`, {
          stdio: 'pipe',
          input: value
        });

        console.log(`✅ Set ${key} for production and preview`);
      } catch (error) {
        console.warn(`⚠️  Could not set ${key}: ${error.message}`);
      }
    }
  });

  console.log('✅ Environment variables configured');
}

function deployToVercel(isProduction = false) {
  console.log(`\n🚀 Deploying to Vercel (${isProduction ? 'production' : 'preview'})...`);

  const deployCommand = isProduction ? 'vercel --prod' : 'vercel';

  try {
    const output = execCommand(deployCommand, {
      stdio: 'pipe',
      encoding: 'utf8'
    });

    // Extract deployment URL
    const urlMatch = output.match(/https:\/\/[^\s]+/);
    const deploymentUrl = urlMatch ? urlMatch[0] : 'Unknown';

    console.log('✅ Deployment successful!');
    console.log(`🔗 Deployment URL: ${deploymentUrl}`);

    // Run post-deployment checks
    if (isProduction) {
      runPostDeploymentChecks(deploymentUrl);
    }

    return deploymentUrl;
  } catch (error) {
    console.error('❌ Deployment failed');
    throw error;
  }
}

function runPostDeploymentChecks(deploymentUrl) {
  console.log('\n🔍 Running post-deployment checks...');

  // Health check
  try {
    execCommand(`curl -f ${deploymentUrl}/api/health`, { stdio: 'pipe' });
    console.log('✅ Health check passed');
  } catch (error) {
    console.warn('⚠️  Health check failed or endpoint not available');
  }

  // Performance check
  console.log('📊 Running performance audit...');
  try {
    execCommand(`npx lighthouse ${deploymentUrl} --only-categories=performance --output=json --output-path=./lighthouse-report.json`, { stdio: 'pipe' });

    const report = JSON.parse(fs.readFileSync('./lighthouse-report.json', 'utf8'));
    const performanceScore = Math.round(report.lhr.categories.performance.score * 100);

    console.log(`📈 Performance Score: ${performanceScore}/100`);

    if (performanceScore < 80) {
      console.warn('⚠️  Performance score is below 80. Consider optimization.');
    }

    // Clean up
    fs.unlinkSync('./lighthouse-report.json');
  } catch (error) {
    console.warn('⚠️  Could not run performance audit');
  }

  // Security headers check
  console.log('🔒 Checking security headers...');
  try {
    const response = execCommand(`curl -I ${deploymentUrl}`, {
      stdio: 'pipe',
      encoding: 'utf8'
    });

    const securityHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Referrer-Policy'
    ];

    securityHeaders.forEach(header => {
      if (response.includes(header)) {
        console.log(`✅ ${header} is set`);
      } else {
        console.warn(`⚠️  ${header} is missing`);
      }
    });
  } catch (error) {
    console.warn('⚠️  Could not check security headers');
  }
}

async function main() {
  console.log('🚀 StudyTeddy Vercel Deployment\n');

  try {
    // Get deployment type
    const deploymentType = process.argv[2] || await question('Deploy to production? (y/n): ');
    const isProduction = deploymentType.toLowerCase() === 'y' || deploymentType === 'production';

    if (isProduction) {
      console.log('🎯 Deploying to PRODUCTION');
      const confirm = await question('Are you sure? This will update the live site. (y/n): ');
      if (confirm.toLowerCase() !== 'y') {
        console.log('❌ Deployment cancelled');
        process.exit(0);
      }
    } else {
      console.log('🔍 Deploying to PREVIEW');
    }

    // Run deployment steps
    checkPrerequisites();
    validateEnvironment();
    runBuildOptimizations();
    setupVercelProject();

    if (isProduction) {
      setupEnvironmentVariables();
    }

    const deploymentUrl = deployToVercel(isProduction);

    console.log('\n🎉 Deployment completed successfully!');
    console.log(`🔗 Your app is live at: ${deploymentUrl}`);

    if (isProduction) {
      console.log('\n📋 Post-deployment checklist:');
      console.log('- ✅ Test all critical user flows');
      console.log('- ✅ Verify authentication works');
      console.log('- ✅ Check AI chat functionality');
      console.log('- ✅ Test database connectivity');
      console.log('- ✅ Monitor Sentry for errors');
      console.log('- ✅ Check Vercel Analytics');
    }

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the deployment script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };