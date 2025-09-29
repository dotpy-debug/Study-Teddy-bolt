#!/usr/bin/env node

/**
 * Setup Verification Script for Study Teddy Monorepo
 *
 * This script verifies that the development environment is properly configured
 * and all dependencies are correctly installed.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

function logHeader(message) {
  log(`\n${colors.bold}=== ${message} ===${colors.reset}`);
}

function executeCommand(command, description) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    logSuccess(`${description}: ${output.trim()}`);
    return output.trim();
  } catch (error) {
    logError(`${description}: Failed - ${error.message}`);
    return null;
  }
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    logSuccess(`${description} exists`);
    return true;
  } else {
    logError(`${description} not found at ${filePath}`);
    return false;
  }
}

function checkWorkspaceStructure() {
  logHeader('Workspace Structure Verification');

  const requiredDirs = [
    'apps/backend',
    'apps/frontend',
    'packages/shared',
    'packages/shared-types',
    'packages/validators',
    'packages/config'
  ];

  let allExist = true;
  requiredDirs.forEach(dir => {
    if (!checkFileExists(dir, `Directory ${dir}`)) {
      allExist = false;
    }
  });

  return allExist;
}

function checkRequiredFiles() {
  logHeader('Required Files Verification');

  const requiredFiles = [
    'package.json',
    'pnpm-workspace.yaml',
    'turbo.json',
    '.nvmrc',
    'SETUP.md',
    'DEPENDENCIES.md',
    'apps/backend/package.json',
    'apps/frontend/package.json'
  ];

  let allExist = true;
  requiredFiles.forEach(file => {
    if (!checkFileExists(file, `File ${file}`)) {
      allExist = false;
    }
  });

  return allExist;
}

function checkNodeVersion() {
  logHeader('Node.js Version Verification');

  const nodeVersion = executeCommand('node --version', 'Node.js version');
  if (!nodeVersion) return false;

  const versionNumber = nodeVersion.replace('v', '');
  const majorVersion = parseInt(versionNumber.split('.')[0]);

  if (majorVersion >= 18) {
    logSuccess(`Node.js version ${nodeVersion} meets requirements (18+)`);
    return true;
  } else {
    logError(`Node.js version ${nodeVersion} is below minimum requirement (18+)`);
    return false;
  }
}

function checkPnpmVersion() {
  logHeader('pnpm Version Verification');

  const pnpmVersion = executeCommand('pnpm --version', 'pnpm version');
  if (!pnpmVersion) {
    logError('pnpm is not installed. Install with: npm install -g pnpm');
    return false;
  }

  const versionNumber = parseFloat(pnpmVersion);
  if (versionNumber >= 8.0) {
    logSuccess(`pnpm version ${pnpmVersion} meets requirements (8.0+)`);
    return true;
  } else {
    logError(`pnpm version ${pnpmVersion} is below minimum requirement (8.0+)`);
    return false;
  }
}

function checkWorkspaceDependencies() {
  logHeader('Workspace Dependencies Verification');

  try {
    const workspaces = execSync('pnpm list --depth=0', { encoding: 'utf8' });
    const expectedWorkspaces = [
      '@studyteddy/backend',
      '@studyteddy/frontend',
      '@studyteddy/shared',
      '@studyteddy/shared-types',
      '@studyteddy/validators',
      '@studyteddy/config'
    ];

    let allFound = true;
    expectedWorkspaces.forEach(workspace => {
      if (workspaces.includes(workspace)) {
        logSuccess(`Workspace ${workspace} is properly installed`);
      } else {
        logError(`Workspace ${workspace} is missing`);
        allFound = false;
      }
    });

    return allFound;
  } catch (error) {
    logError(`Failed to check workspace dependencies: ${error.message}`);
    return false;
  }
}

function checkTypeScriptVersion() {
  logHeader('TypeScript Version Verification');

  try {
    const tsVersion = execSync('npx tsc --version', { encoding: 'utf8' });
    logSuccess(`TypeScript version: ${tsVersion.trim()}`);

    // Check if it's the expected version
    if (tsVersion.includes('5.7')) {
      logSuccess('TypeScript version matches project requirements');
      return true;
    } else {
      logWarning('TypeScript version differs from project specification (5.7.x)');
      return true; // Still functional, just a warning
    }
  } catch (error) {
    logError(`TypeScript check failed: ${error.message}`);
    return false;
  }
}

function checkEnvironmentFiles() {
  logHeader('Environment Files Verification');

  const envFiles = [
    { file: '.env.example', required: true },
    { file: '.env', required: false },
    { file: 'apps/backend/.env.example', required: true },
    { file: 'apps/backend/.env', required: false },
    { file: 'apps/frontend/.env.production.template', required: false },
    { file: 'apps/frontend/.env.local', required: false }
  ];

  let criticalIssues = false;
  envFiles.forEach(({ file, required }) => {
    if (fs.existsSync(file)) {
      logSuccess(`Environment file ${file} exists`);
    } else {
      if (required) {
        logError(`Required environment file ${file} is missing`);
        criticalIssues = true;
      } else {
        logWarning(`Optional environment file ${file} not found`);
      }
    }
  });

  return !criticalIssues;
}

function checkBuildStatus() {
  logHeader('Build Status Verification');

  const sharedPackages = [
    'packages/shared-types',
    'packages/shared',
    'packages/config',
    'packages/validators'
  ];

  let allBuilt = true;
  sharedPackages.forEach(pkg => {
    const distPath = path.join(pkg, 'dist');
    if (fs.existsSync(distPath)) {
      logSuccess(`${pkg} is built (dist folder exists)`);
    } else {
      logWarning(`${pkg} is not built (run 'pnpm build' to build)`);
      allBuilt = false;
    }
  });

  return allBuilt;
}

function provideSuggestions(issues) {
  logHeader('Setup Suggestions');

  if (issues.length === 0) {
    logSuccess('All verifications passed! Your setup is ready for development.');
    logInfo('\nNext steps:');
    logInfo('1. Copy .env.example to .env and configure your environment variables');
    logInfo('2. Start Docker services: pnpm docker:up');
    logInfo('3. Initialize database: pnpm db:push');
    logInfo('4. Start development servers: pnpm dev');
    return;
  }

  logWarning('\nIssues found that need attention:');
  issues.forEach(issue => {
    logError(`• ${issue}`);
  });

  logInfo('\nRecommended actions:');
  logInfo('1. Review the SETUP.md file for detailed instructions');
  logInfo('2. Check the DEPENDENCIES.md file for dependency information');
  logInfo('3. Run the following commands to fix common issues:');
  logInfo('   - pnpm install (reinstall dependencies)');
  logInfo('   - pnpm build (build shared packages)');
  logInfo('   - pnpm validate:env (check environment setup)');
}

function main() {
  log(`${colors.bold}Study Teddy Setup Verification${colors.reset}`);
  log('This script verifies your development environment setup.\n');

  const issues = [];

  // Run all verification checks
  if (!checkNodeVersion()) issues.push('Node.js version requirement not met');
  if (!checkPnpmVersion()) issues.push('pnpm version requirement not met');
  if (!checkWorkspaceStructure()) issues.push('Workspace structure incomplete');
  if (!checkRequiredFiles()) issues.push('Required files missing');
  if (!checkWorkspaceDependencies()) issues.push('Workspace dependencies not properly installed');
  if (!checkTypeScriptVersion()) issues.push('TypeScript not available');
  if (!checkEnvironmentFiles()) issues.push('Critical environment files missing');
  if (!checkBuildStatus()) issues.push('Shared packages not built');

  // Provide suggestions based on results
  provideSuggestions(issues);

  // Exit with appropriate code
  process.exit(issues.length === 0 ? 0 : 1);
}

// Run the verification
main();