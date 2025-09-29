#!/usr/bin/env node

/**
 * Staging Environment Setup Script
 *
 * This script sets up a dedicated staging environment with:
 * - Separate database
 * - Preview-specific configuration
 * - Testing utilities
 * - Environment isolation
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
      encoding: 'utf8',
      stdio: 'inherit',
      ...options
    });
  } catch (error) {
    if (!options.allowFailure) {
      console.error(`❌ Command failed: ${command}`);
      throw error;
    }
    return null;
  }
}

async function setupStagingDatabase() {
  console.log('🗄️  Setting up staging database...');

  const useExisting = await question('Do you have a separate staging database? (y/n): ');

  let stagingDatabaseUrl;

  if (useExisting.toLowerCase() === 'y') {
    stagingDatabaseUrl = await question('Staging database URL: ');
  } else {
    console.log('\n📋 Creating staging database on Neon:');
    console.log('1. Go to https://console.neon.tech/');
    console.log('2. Create a new database named "studyteddy-staging"');
    console.log('3. Copy the connection string');

    await question('Press Enter when ready...');
    stagingDatabaseUrl = await question('Staging database URL: ');
  }

  // Create staging environment file
  const stagingEnvContent = `# Staging Environment Configuration
NODE_ENV=staging
VERCEL_ENV=preview
NEXT_PUBLIC_APP_ENV=staging

# Staging Database
DATABASE_URL=${stagingDatabaseUrl}
DIRECT_DATABASE_URL=${stagingDatabaseUrl}

# Staging-specific settings
NEXT_PUBLIC_API_URL=https://studyteddy-staging.vercel.app
NEXTAUTH_URL=https://studyteddy-staging.vercel.app

# Debug settings for staging
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_SHOW_PERFORMANCE_METRICS=true

# Reduced rate limits for testing
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=300000

# Test user access
NEXT_PUBLIC_ALLOW_TEST_USERS=true
`;

  fs.writeFileSync(
    path.join(process.cwd(), 'apps', 'frontend', '.env.staging'),
    stagingEnvContent
  );

  console.log('✅ Staging environment configuration created');
  return stagingDatabaseUrl;
}

async function createStagingProject() {
  console.log('\n🚀 Creating staging Vercel project...');

  try {
    // Check if we're already linked to a project
    execCommand('vercel link --yes', { stdio: 'pipe' });
    console.log('✅ Already linked to a Vercel project');
  } catch (error) {
    console.log('🆕 Creating new staging project...');
    execCommand('vercel --name studyteddy-staging --confirm');
  }

  // Set up staging-specific configuration
  const stagingConfigPath = path.join(process.cwd(), 'vercel-staging.json');
  if (fs.existsSync(stagingConfigPath)) {
    console.log('📄 Using staging-specific Vercel configuration');
  }

  console.log('✅ Staging project configured');
}

async function setupPreviewDeployments() {
  console.log('\n🔍 Setting up preview deployments...');

  // Create preview deployment script
  const previewScript = `#!/bin/bash

# Preview Deployment Script for StudyTeddy
# This script creates preview deployments for feature branches

set -e

BRANCH_NAME=\$(git rev-parse --abbrev-ref HEAD)
COMMIT_SHA=\$(git rev-parse --short HEAD)

echo "🌿 Deploying branch: \$BRANCH_NAME (\$COMMIT_SHA)"

# Validate environment
if [ ! -f "apps/frontend/.env.staging" ]; then
  echo "❌ Staging environment file not found"
  exit 1
fi

# Build for preview
echo "🔨 Building for preview..."
bun clean
bun build:packages
bun run build --filter=@studyteddy/frontend

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
DEPLOYMENT_URL=\$(vercel --confirm --token=\$VERCEL_TOKEN)

echo "✅ Preview deployment completed!"
echo "🔗 URL: \$DEPLOYMENT_URL"

# Run smoke tests
echo "💨 Running smoke tests..."
sleep 30 # Wait for deployment to be ready

curl -f "\$DEPLOYMENT_URL" > /dev/null && echo "✅ Homepage accessible" || echo "❌ Homepage failed"
curl -f "\$DEPLOYMENT_URL/api/health" > /dev/null && echo "✅ API health check passed" || echo "❌ API health check failed"

echo "🎉 Preview deployment verification completed!"
`;

  fs.writeFileSync(path.join(process.cwd(), 'scripts', 'deploy-preview.sh'), previewScript);
  execCommand('chmod +x scripts/deploy-preview.sh');

  console.log('✅ Preview deployment script created');
}

async function setupBranchProtectionRules() {
  console.log('\n🛡️  Setting up branch protection...');

  // Create branch protection configuration
  const branchProtectionConfig = {
    protection: {
      required_status_checks: {
        strict: true,
        contexts: [
          'vercel',
          'ci/tests',
          'ci/build',
          'ci/performance'
        ]
      },
      enforce_admins: false,
      required_pull_request_reviews: {
        required_approving_review_count: 1,
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false
      },
      restrictions: null,
      allow_force_pushes: false,
      allow_deletions: false
    }
  };

  fs.writeFileSync(
    path.join(process.cwd(), '.github', 'branch-protection.json'),
    JSON.stringify(branchProtectionConfig, null, 2)
  );

  console.log('📄 Branch protection configuration created');
  console.log('💡 Apply this manually in GitHub repository settings');
}

function setupEnvironmentVariables() {
  console.log('\n🔧 Setting up staging environment variables...');

  const stagingEnvPath = path.join(process.cwd(), 'apps', 'frontend', '.env.staging');

  if (!fs.existsSync(stagingEnvPath)) {
    console.error('❌ Staging environment file not found');
    return;
  }

  const envContent = fs.readFileSync(stagingEnvPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });

  console.log(`📝 Found ${Object.keys(envVars).length} staging environment variables`);

  // Create a script to set Vercel environment variables
  const setEnvScript = `#!/bin/bash

# Script to set staging environment variables on Vercel
# Run this script after creating the staging project

echo "🔧 Setting staging environment variables..."

${Object.entries(envVars).map(([key, value]) =>
  `echo "${value}" | vercel env add ${key} preview`
).join('\n')}

echo "✅ Staging environment variables configured"
`;

  fs.writeFileSync(path.join(process.cwd(), 'scripts', 'set-staging-env.sh'), setEnvScript);
  execCommand('chmod +x scripts/set-staging-env.sh');

  console.log('✅ Environment variables script created');
  console.log('💡 Run scripts/set-staging-env.sh to configure Vercel');
}

function createStagingDocumentation() {
  const documentation = `# Staging Environment Guide

## Overview

The staging environment is a production-like environment used for:
- Testing new features before production release
- QA validation
- Client demos
- Integration testing

## Access

- **URL**: https://studyteddy-staging.vercel.app
- **Environment**: \`staging\`
- **Database**: Separate staging database

## Features

### Preview Deployments
- Automatic deployments for all pull requests
- Branch-specific URLs for feature testing
- Smoke tests after deployment

### Testing Utilities
- Debug mode enabled
- Performance metrics visible
- Test user access allowed
- Relaxed rate limits

### Environment Isolation
- Separate database from production
- Staging-specific configuration
- No impact on production data

## Deployment Process

### Manual Deployment
\`\`\`bash
# Deploy current branch to staging
bun scripts/deploy-preview.sh
\`\`\`

### Automatic Deployment
- Pull requests automatically deploy to preview URLs
- \`develop\` branch deploys to staging environment
- \`main\` branch deploys to production

## Configuration

### Environment Variables
- Staging environment variables are in \`.env.staging\`
- Set on Vercel using \`scripts/set-staging-env.sh\`

### Database
- Staging database is separate from production
- Migrations run automatically on deployment
- Test data can be safely modified

## Testing

### Smoke Tests
- Homepage accessibility
- API health checks
- Authentication flow
- Core functionality

### Performance Testing
- Lighthouse audits
- Bundle size validation
- Core Web Vitals monitoring

## Monitoring

### Available Tools
- Vercel Analytics
- Sentry error tracking (staging project)
- Performance monitoring
- Debug information

### Logs
- Function logs in Vercel dashboard
- Error tracking in Sentry
- Performance metrics in browser

## Best Practices

### Development
1. Create feature branches from \`develop\`
2. Test in preview deployment
3. Merge to \`develop\` for staging deployment
4. Final testing in staging
5. Merge to \`main\` for production

### Testing
1. Verify all features work in staging
2. Check performance metrics
3. Test edge cases
4. Validate integrations

### Data Management
1. Use test data in staging
2. Don't use production secrets
3. Regularly reset staging data
4. Document test scenarios

## Troubleshooting

### Common Issues
- Environment variable mismatches
- Database connection issues
- Build failures
- Performance regressions

### Solutions
- Check environment variable configuration
- Verify database connectivity
- Review build logs
- Run performance audits

## Maintenance

### Regular Tasks
- Update staging environment variables
- Reset test data monthly
- Review and update documentation
- Monitor resource usage

### Security
- Staging uses separate authentication
- No production data access
- Limited external integrations
- Regular security updates
`;

  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(docsDir, 'staging-environment.md'), documentation);
  console.log('📚 Staging environment documentation created');
}

async function main() {
  console.log('🎭 StudyTeddy Staging Environment Setup\n');

  try {
    await setupStagingDatabase();
    await createStagingProject();
    await setupPreviewDeployments();
    await setupBranchProtectionRules();
    setupEnvironmentVariables();
    createStagingDocumentation();

    console.log('\n🎉 Staging environment setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Run scripts/set-staging-env.sh to configure Vercel environment variables');
    console.log('2. Set up branch protection rules in GitHub');
    console.log('3. Test preview deployment with scripts/deploy-preview.sh');
    console.log('4. Configure team access in Vercel dashboard');
    console.log('5. Set up monitoring and alerts');

    console.log('\n🔗 Useful commands:');
    console.log('- Deploy preview: bun scripts/deploy-preview.sh');
    console.log('- Set environment variables: bun scripts/set-staging-env.sh');
    console.log('- View documentation: docs/staging-environment.md');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };