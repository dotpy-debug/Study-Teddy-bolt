#!/usr/bin/env bun

/**
 * Semantic Release Automation Script for StudyTeddy
 * Handles automatic versioning, changelog generation, and release management
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

class SemanticRelease {
  constructor() {
    this.projectRoot = process.cwd();
    this.packageJsonPath = join(this.projectRoot, 'package.json');
    this.changelogPath = join(this.projectRoot, 'CHANGELOG.md');
    this.currentVersion = this.getCurrentVersion();
    this.gitRemote = 'origin';
    this.mainBranch = 'main';
  }

  /**
   * Get current version from package.json
   */
  getCurrentVersion() {
    try {
      const packageJson = JSON.parse(readFileSync(this.packageJsonPath, 'utf8'));
      return packageJson.version || '0.0.0';
    } catch (error) {
      console.error('Error reading package.json:', error.message);
      return '0.0.0';
    }
  }

  /**
   * Get the last Git tag
   */
  getLastTag() {
    try {
      return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get commits since last tag
   */
  getCommitsSinceLastTag() {
    const lastTag = this.getLastTag();
    const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';

    try {
      const commits = execSync(`git log ${range} --pretty=format:"%H|%s|%b|%an|%ae|%ad" --date=iso`, {
        encoding: 'utf8'
      }).trim();

      if (!commits) return [];

      return commits.split('\n').map(commit => {
        const [hash, subject, body, author, email, date] = commit.split('|');
        return { hash, subject, body, author, email, date };
      });
    } catch (error) {
      console.error('Error getting commits:', error.message);
      return [];
    }
  }

  /**
   * Analyze commits to determine release type
   */
  analyzeCommits(commits) {
    let releaseType = null;
    const features = [];
    const fixes = [];
    const breakingChanges = [];
    const others = [];

    commits.forEach(commit => {
      const { subject, body } = commit;
      const fullMessage = `${subject}\n${body}`.toLowerCase();

      // Check for breaking changes
      if (fullMessage.includes('breaking change') || fullMessage.includes('breaking:') || subject.includes('!:')) {
        breakingChanges.push(commit);
        releaseType = 'major';
      }
      // Check for features
      else if (subject.startsWith('feat:') || subject.startsWith('feature:')) {
        features.push(commit);
        if (releaseType !== 'major') releaseType = 'minor';
      }
      // Check for fixes
      else if (subject.startsWith('fix:') || subject.startsWith('bugfix:')) {
        fixes.push(commit);
        if (!releaseType) releaseType = 'patch';
      }
      // Other types
      else {
        others.push(commit);
      }
    });

    return {
      releaseType: releaseType || 'patch',
      features,
      fixes,
      breakingChanges,
      others
    };
  }

  /**
   * Calculate next version based on release type
   */
  calculateNextVersion(releaseType, currentVersion = this.currentVersion) {
    const [major, minor, patch] = currentVersion.replace(/^v/, '').split('.').map(Number);

    switch (releaseType) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        throw new Error(`Invalid release type: ${releaseType}`);
    }
  }

  /**
   * Generate changelog content
   */
  generateChangelog(version, analysis, commits) {
    const date = new Date().toISOString().split('T')[0];
    let changelog = `# [${version}](https://github.com/mohamed-elkholy95/studyteddy/releases/tag/v${version}) (${date})\n\n`;

    // Breaking changes
    if (analysis.breakingChanges.length > 0) {
      changelog += '### ⚠ BREAKING CHANGES\n\n';
      analysis.breakingChanges.forEach(commit => {
        changelog += `* ${commit.subject}\n`;
      });
      changelog += '\n';
    }

    // Features
    if (analysis.features.length > 0) {
      changelog += '### ✨ Features\n\n';
      analysis.features.forEach(commit => {
        const shortHash = commit.hash.substring(0, 8);
        changelog += `* ${commit.subject} ([${shortHash}](https://github.com/mohamed-elkholy95/studyteddy/commit/${commit.hash}))\n`;
      });
      changelog += '\n';
    }

    // Bug fixes
    if (analysis.fixes.length > 0) {
      changelog += '### 🐛 Bug Fixes\n\n';
      analysis.fixes.forEach(commit => {
        const shortHash = commit.hash.substring(0, 8);
        changelog += `* ${commit.subject} ([${shortHash}](https://github.com/mohamed-elkholy95/studyteddy/commit/${commit.hash}))\n`;
      });
      changelog += '\n';
    }

    // Other changes
    if (analysis.others.length > 0) {
      changelog += '### 🔧 Other Changes\n\n';
      analysis.others.forEach(commit => {
        const shortHash = commit.hash.substring(0, 8);
        changelog += `* ${commit.subject} ([${shortHash}](https://github.com/mohamed-elkholy95/studyteddy/commit/${commit.hash}))\n`;
      });
      changelog += '\n';
    }

    // Contributors
    const contributors = [...new Set(commits.map(c => c.author))];
    if (contributors.length > 0) {
      changelog += '### 👥 Contributors\n\n';
      contributors.forEach(contributor => {
        changelog += `* ${contributor}\n`;
      });
      changelog += '\n';
    }

    return changelog;
  }

  /**
   * Update CHANGELOG.md file
   */
  updateChangelogFile(newContent) {
    let existingContent = '';

    if (existsSync(this.changelogPath)) {
      existingContent = readFileSync(this.changelogPath, 'utf8');
      // Remove the first line if it's just "# Changelog"
      if (existingContent.startsWith('# Changelog\n')) {
        existingContent = existingContent.substring('# Changelog\n'.length);
      }
    }

    const fullChangelog = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n${newContent}${existingContent}`;
    writeFileSync(this.changelogPath, fullChangelog);

    console.log(`✅ Updated ${this.changelogPath}`);
  }

  /**
   * Update package.json version
   */
  updatePackageVersion(version) {
    const packageJson = JSON.parse(readFileSync(this.packageJsonPath, 'utf8'));
    packageJson.version = version;
    writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

    console.log(`✅ Updated package.json to version ${version}`);
  }

  /**
   * Update workspace package versions
   */
  updateWorkspaceVersions(version) {
    const workspaces = ['apps/backend', 'apps/frontend', 'packages/shared', 'packages/shared-types', 'packages/validators', 'packages/config'];

    workspaces.forEach(workspace => {
      const packagePath = join(this.projectRoot, workspace, 'package.json');

      if (existsSync(packagePath)) {
        try {
          const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
          packageJson.version = version;
          writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
          console.log(`✅ Updated ${workspace}/package.json to version ${version}`);
        } catch (error) {
          console.warn(`⚠️  Could not update ${workspace}/package.json: ${error.message}`);
        }
      }
    });
  }

  /**
   * Create Git tag
   */
  createGitTag(version, message) {
    try {
      execSync(`git tag -a v${version} -m "${message}"`);
      console.log(`✅ Created Git tag v${version}`);
      return true;
    } catch (error) {
      console.error(`❌ Error creating Git tag: ${error.message}`);
      return false;
    }
  }

  /**
   * Push changes and tags to remote
   */
  pushToRemote() {
    try {
      execSync(`git push ${this.gitRemote} ${this.mainBranch}`);
      execSync(`git push ${this.gitRemote} --tags`);
      console.log(`✅ Pushed changes and tags to ${this.gitRemote}`);
      return true;
    } catch (error) {
      console.error(`❌ Error pushing to remote: ${error.message}`);
      return false;
    }
  }

  /**
   * Commit changes
   */
  commitChanges(version) {
    try {
      execSync('git add package.json CHANGELOG.md apps/*/package.json packages/*/package.json');
      execSync(`git commit -m "chore: release v${version}"`);
      console.log(`✅ Committed release changes for v${version}`);
      return true;
    } catch (error) {
      console.error(`❌ Error committing changes: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if working directory is clean
   */
  isWorkingDirectoryClean() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      return status.trim() === '';
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate release preconditions
   */
  validatePreconditions() {
    const errors = [];

    // Check if we're on the main branch
    try {
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      if (currentBranch !== this.mainBranch) {
        errors.push(`Must be on ${this.mainBranch} branch (currently on ${currentBranch})`);
      }
    } catch (error) {
      errors.push('Could not determine current Git branch');
    }

    // Check if working directory is clean
    if (!this.isWorkingDirectoryClean()) {
      errors.push('Working directory must be clean (no uncommitted changes)');
    }

    // Check if remote is accessible
    try {
      execSync(`git ls-remote ${this.gitRemote}`, { stdio: 'pipe' });
    } catch (error) {
      errors.push(`Cannot access Git remote: ${this.gitRemote}`);
    }

    return errors;
  }

  /**
   * Generate release notes for GitHub
   */
  generateReleaseNotes(version, analysis, commits) {
    let notes = `## What's Changed\n\n`;

    // Breaking changes
    if (analysis.breakingChanges.length > 0) {
      notes += '### ⚠️ Breaking Changes\n\n';
      analysis.breakingChanges.forEach(commit => {
        notes += `- ${commit.subject}\n`;
      });
      notes += '\n';
    }

    // Features
    if (analysis.features.length > 0) {
      notes += '### ✨ New Features\n\n';
      analysis.features.forEach(commit => {
        notes += `- ${commit.subject}\n`;
      });
      notes += '\n';
    }

    // Bug fixes
    if (analysis.fixes.length > 0) {
      notes += '### 🐛 Bug Fixes\n\n';
      analysis.fixes.forEach(commit => {
        notes += `- ${commit.subject}\n`;
      });
      notes += '\n';
    }

    // Contributors
    const contributors = [...new Set(commits.map(c => c.author))];
    if (contributors.length > 0) {
      notes += '### 👥 Contributors\n\n';
      contributors.forEach(contributor => {
        notes += `- ${contributor}\n`;
      });
      notes += '\n';
    }

    const lastTag = this.getLastTag();
    const compareUrl = lastTag
      ? `https://github.com/mohamed-elkholy95/studyteddy/compare/${lastTag}...v${version}`
      : `https://github.com/mohamed-elkholy95/studyteddy/commits/v${version}`;

    notes += `**Full Changelog**: ${compareUrl}\n`;

    return notes;
  }

  /**
   * Main release function
   */
  async release(options = {}) {
    const {
      dryRun = false,
      releaseType = null,
      skipValidation = false,
      skipPush = false
    } = options;

    console.log('🚀 Starting semantic release process...\n');

    // Validate preconditions
    if (!skipValidation) {
      const errors = this.validatePreconditions();
      if (errors.length > 0) {
        console.error('❌ Release validation failed:');
        errors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
      }
    }

    // Get commits since last tag
    const commits = this.getCommitsSinceLastTag();
    if (commits.length === 0) {
      console.log('ℹ️  No new commits since last release. Nothing to release.');
      return;
    }

    console.log(`📝 Found ${commits.length} commits since last release`);

    // Analyze commits
    const analysis = this.analyzeCommits(commits);
    const finalReleaseType = releaseType || analysis.releaseType;
    const nextVersion = this.calculateNextVersion(finalReleaseType);

    console.log(`📊 Release analysis:`);
    console.log(`  - Current version: ${this.currentVersion}`);
    console.log(`  - Next version: ${nextVersion}`);
    console.log(`  - Release type: ${finalReleaseType}`);
    console.log(`  - Features: ${analysis.features.length}`);
    console.log(`  - Bug fixes: ${analysis.fixes.length}`);
    console.log(`  - Breaking changes: ${analysis.breakingChanges.length}`);
    console.log(`  - Other changes: ${analysis.others.length}`);

    if (dryRun) {
      console.log('\n🔍 Dry run mode - no changes will be made');

      // Generate and display changelog
      const changelog = this.generateChangelog(nextVersion, analysis, commits);
      console.log('\n📄 Generated changelog:');
      console.log('─'.repeat(50));
      console.log(changelog);
      console.log('─'.repeat(50));

      // Generate and display release notes
      const releaseNotes = this.generateReleaseNotes(nextVersion, analysis, commits);
      console.log('\n📋 Generated release notes:');
      console.log('─'.repeat(50));
      console.log(releaseNotes);
      console.log('─'.repeat(50));

      return;
    }

    // Generate changelog
    const changelog = this.generateChangelog(nextVersion, analysis, commits);

    // Update files
    this.updateChangelogFile(changelog);
    this.updatePackageVersion(nextVersion);
    this.updateWorkspaceVersions(nextVersion);

    // Commit changes
    if (!this.commitChanges(nextVersion)) {
      console.error('❌ Failed to commit changes');
      process.exit(1);
    }

    // Create Git tag
    const tagMessage = `Release v${nextVersion}`;
    if (!this.createGitTag(nextVersion, tagMessage)) {
      console.error('❌ Failed to create Git tag');
      process.exit(1);
    }

    // Push to remote
    if (!skipPush) {
      if (!this.pushToRemote()) {
        console.error('❌ Failed to push to remote');
        process.exit(1);
      }
    }

    // Generate release notes for GitHub
    const releaseNotes = this.generateReleaseNotes(nextVersion, analysis, commits);
    const releaseNotesPath = join(this.projectRoot, '.github', 'release-notes.md');
    writeFileSync(releaseNotesPath, releaseNotes);
    console.log(`✅ Generated release notes at ${releaseNotesPath}`);

    console.log(`\n🎉 Successfully released v${nextVersion}!`);
    console.log(`\n📋 Next steps:`);
    console.log(`  - Create GitHub release: https://github.com/mohamed-elkholy95/studyteddy/releases/new?tag=v${nextVersion}`);
    console.log(`  - Deploy to staging: ./scripts/deployment/deploy-kubernetes.sh staging rolling v${nextVersion}`);
    console.log(`  - Deploy to production: ./scripts/deployment/deploy-kubernetes.sh production blue-green v${nextVersion}`);

    return {
      version: nextVersion,
      releaseType: finalReleaseType,
      changelog,
      releaseNotes,
      analysis
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--release-type':
        options.releaseType = args[++i];
        break;
      case '--skip-validation':
        options.skipValidation = true;
        break;
      case '--skip-push':
        options.skipPush = true;
        break;
      case '--help':
        console.log(`
StudyTeddy Semantic Release Tool

Usage: bun run scripts/release/semantic-release.js [options]

Options:
  --dry-run             Preview changes without making them
  --release-type TYPE   Force release type (major, minor, patch)
  --skip-validation     Skip pre-release validation checks
  --skip-push           Skip pushing to remote repository
  --help                Show this help message

Examples:
  bun run scripts/release/semantic-release.js --dry-run
  bun run scripts/release/semantic-release.js --release-type minor
  bun run scripts/release/semantic-release.js --skip-push
        `);
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  try {
    const releaseManager = new SemanticRelease();
    await releaseManager.release(options);
  } catch (error) {
    console.error('❌ Release failed:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export default SemanticRelease;