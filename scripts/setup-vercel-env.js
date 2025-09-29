#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup Script
 *
 * This script automates the setup of environment variables on Vercel
 * for both preview and production environments.
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

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const envVars = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();

      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, '');

      if (cleanValue && !cleanValue.startsWith('your-') && cleanValue !== 'YOUR_VALUE_HERE') {
        envVars[key.trim()] = cleanValue;
      }
    }
  });

  return envVars;
}

function checkVercelCLI() {
  try {
    execCommand('vercel --version', { stdio: 'pipe' });
    console.log('✅ Vercel CLI is available');
  } catch (error) {
    console.log('📦 Installing Vercel CLI...');
    execCommand('npm install -g vercel');
  }

  try {
    execCommand('vercel whoami', { stdio: 'pipe' });
    console.log('✅ Logged in to Vercel');
  } catch (error) {
    console.log('🔐 Please log in to Vercel...');
    execCommand('vercel login');
  }
}

async function linkProject() {
  console.log('\n🔗 Linking to Vercel project...');

  try {
    const result = execCommand('vercel link --yes', { stdio: 'pipe' });
    console.log('✅ Project linked successfully');
    return true;
  } catch (error) {
    console.log('🆕 No existing project found. Creating new project...');

    const projectName = await question('Enter project name (studyteddy): ') || 'studyteddy';

    try {
      execCommand(`vercel --name ${projectName} --confirm`, { stdio: 'inherit' });
      console.log('✅ New project created and linked');
      return true;
    } catch (createError) {
      console.error('❌ Failed to create project');
      return false;
    }
  }
}

function setVercelEnvVar(key, value, environment) {
  try {
    // Use echo to pipe the value to vercel env add
    const command = `echo "${value}" | vercel env add ${key} ${environment}`;
    execCommand(command, { stdio: 'pipe' });
    return true;
  } catch (error) {
    // Try alternative method
    try {
      const tempFile = `/tmp/vercel_env_${key}`;
      fs.writeFileSync(tempFile, value);
      execCommand(`vercel env add ${key} ${environment} < ${tempFile}`, { stdio: 'pipe' });
      fs.unlinkSync(tempFile);
      return true;
    } catch (altError) {
      return false;
    }
  }
}

async function setupEnvironmentVariables() {
  console.log('\n🔧 Setting up environment variables...');

  // Define environment files to check
  const envFiles = [
    path.join(process.cwd(), 'apps', 'frontend', '.env.production.local'),
    path.join(process.cwd(), 'apps', 'frontend', '.env.local'),
    path.join(process.cwd(), '.env.production'),
    path.join(process.cwd(), '.env')
  ];

  let envVars = {};

  // Merge environment variables from all files
  envFiles.forEach(filePath => {
    const vars = parseEnvFile(filePath);
    envVars = { ...envVars, ...vars };
  });

  if (Object.keys(envVars).length === 0) {
    console.warn('⚠️  No environment variables found!');
    console.log('💡 Please create a .env.production.local file with your configuration');
    return;
  }

  console.log(`📝 Found ${Object.keys(envVars).length} environment variables`);

  // Ask which environments to update
  const updateProduction = await question('Update production environment? (y/n): ');
  const updatePreview = await question('Update preview environment? (y/n): ');

  let successCount = 0;
  let failureCount = 0;

  for (const [key, value] of Object.entries(envVars)) {
    console.log(`\n🔄 Setting ${key}...`);

    if (updateProduction.toLowerCase() === 'y') {
      if (setVercelEnvVar(key, value, 'production')) {
        console.log(`  ✅ Production: ${key}`);
        successCount++;
      } else {
        console.log(`  ❌ Production: ${key} failed`);
        failureCount++;
      }
    }

    if (updatePreview.toLowerCase() === 'y') {
      if (setVercelEnvVar(key, value, 'preview')) {
        console.log(`  ✅ Preview: ${key}`);
        successCount++;
      } else {
        console.log(`  ❌ Preview: ${key} failed`);
        failureCount++;
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Results: ${successCount} successful, ${failureCount} failed`);

  if (failureCount > 0) {
    console.log('\n💡 For failed variables, try setting them manually:');
    console.log('1. Go to https://vercel.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to Settings → Environment Variables');
    console.log('4. Add the variables manually');
  }
}

async function validateEnvironment() {
  console.log('\n🔍 Validating environment setup...');

  try {
    const envList = execCommand('vercel env ls', { stdio: 'pipe' });

    const requiredVars = [
      'NEXTAUTH_SECRET',
      'DATABASE_URL',
      'GOOGLE_CLIENT_ID',
      'OPENAI_API_KEY'
    ];

    const missingVars = requiredVars.filter(varName =>
      !envList.includes(varName)
    );

    if (missingVars.length > 0) {
      console.warn('⚠️  Missing critical environment variables:');
      missingVars.forEach(varName => console.log(`  - ${varName}`));
      console.log('\n💡 Please set these variables before deploying');
      return false;
    }

    console.log('✅ All critical environment variables are set');
    return true;
  } catch (error) {
    console.warn('⚠️  Could not validate environment variables');
    return false;
  }
}

function createEnvDocumentation() {
  const documentation = `# Environment Variables Documentation

## Required Variables

### Core Application
- \`NEXTAUTH_URL\`: Your production domain (e.g., https://studyteddy.vercel.app)
- \`NEXTAUTH_SECRET\`: Random 32+ character string for JWT signing
- \`NODE_ENV\`: Set to "production"

### Database (Neon)
- \`DATABASE_URL\`: Neon pooled connection string with pgbouncer=true
- \`DIRECT_DATABASE_URL\`: Neon direct connection string for migrations

### Authentication
- \`GOOGLE_CLIENT_ID\`: Google OAuth client ID
- \`GOOGLE_CLIENT_SECRET\`: Google OAuth client secret

### AI Services
- \`OPENAI_API_KEY\`: OpenAI API key for GPT functionality
- \`DEEPSEEK_API_KEY\`: (Optional) DeepSeek API key as backup

### Monitoring
- \`SENTRY_DSN\`: Sentry error tracking DSN
- \`SENTRY_ORG\`: Sentry organization name
- \`SENTRY_PROJECT\`: Sentry project name

## Setting Variables

### Via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project
3. Navigate to Settings → Environment Variables
4. Add each variable for Production and Preview environments

### Via CLI
\`\`\`bash
vercel env add VARIABLE_NAME production
vercel env add VARIABLE_NAME preview
\`\`\`

### Via This Script
\`\`\`bash
bun scripts/setup-vercel-env.js
\`\`\`

## Security Notes
- Never commit actual values to git
- Use different values for preview/production when possible
- Rotate secrets regularly
- Monitor Vercel logs for any exposed values
`;

  fs.writeFileSync(path.join(process.cwd(), 'docs', 'environment-variables.md'), documentation);
  console.log('📚 Created environment variables documentation');
}

async function main() {
  console.log('🔧 StudyTeddy Vercel Environment Setup\n');

  try {
    checkVercelCLI();

    const linked = await linkProject();
    if (!linked) {
      console.error('❌ Could not link project');
      process.exit(1);
    }

    await setupEnvironmentVariables();

    const isValid = await validateEnvironment();

    // Create documentation
    if (!fs.existsSync(path.join(process.cwd(), 'docs'))) {
      fs.mkdirSync(path.join(process.cwd(), 'docs'), { recursive: true });
    }
    createEnvDocumentation();

    console.log('\n🎉 Environment setup completed!');

    if (isValid) {
      console.log('✅ Your project is ready for deployment');
      console.log('\n📋 Next steps:');
      console.log('1. Run: bun scripts/deploy-to-vercel.js');
      console.log('2. Test your deployment');
      console.log('3. Set up monitoring and alerts');
    } else {
      console.log('⚠️  Please fix missing variables before deploying');
    }

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