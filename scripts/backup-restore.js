#!/usr/bin/env node

/**
 * Backup and Restore Script for StudyTeddy
 *
 * This script provides comprehensive backup and restore functionality:
 * - Database backups (automated and manual)
 * - Configuration backups
 * - Migration management
 * - Disaster recovery procedures
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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
      stdio: options.silent ? 'pipe' : 'inherit',
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

function ensureBackupDir() {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Create subdirectories
  const subdirs = ['database', 'config', 'code', 'logs'];
  subdirs.forEach(dir => {
    const fullPath = path.join(backupDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });

  return backupDir;
}

async function createDatabaseBackup(environment = 'production') {
  console.log(`🗄️  Creating database backup for ${environment}...`);

  const backupDir = ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `studyteddy-${environment}-${timestamp}`;

  // Get database URL from environment
  let databaseUrl;

  if (environment === 'production') {
    const envPath = path.join(process.cwd(), 'apps', 'frontend', '.env.production.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/DIRECT_DATABASE_URL=(.+)/);
      if (match) {
        databaseUrl = match[1].trim();
      }
    }
  } else {
    databaseUrl = process.env.DATABASE_URL;
  }

  if (!databaseUrl) {
    console.error('❌ Database URL not found');
    return null;
  }

  console.log('📦 Creating database dump...');

  try {
    // Create database dump
    const dumpPath = path.join(backupDir, 'database', `${backupName}.sql`);

    execCommand(`pg_dump "${databaseUrl}" > "${dumpPath}"`, { silent: true });

    // Compress the backup
    execCommand(`gzip "${dumpPath}"`);
    const compressedPath = `${dumpPath}.gz`;

    // Get file size
    const stats = fs.statSync(compressedPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Database backup created: ${path.basename(compressedPath)} (${fileSizeInMB} MB)`);

    // Create backup metadata
    const metadata = {
      name: backupName,
      environment,
      timestamp: new Date().toISOString(),
      size: stats.size,
      checksum: execCommand(`shasum -a 256 "${compressedPath}"`, { silent: true, encoding: 'utf8' }).split(' ')[0],
      tables: getDatabaseTables(databaseUrl),
      version: getSchemaVersion()
    };

    fs.writeFileSync(
      path.join(backupDir, 'database', `${backupName}.metadata.json`),
      JSON.stringify(metadata, null, 2)
    );

    return {
      path: compressedPath,
      metadata
    };

  } catch (error) {
    console.error('❌ Database backup failed:', error.message);
    return null;
  }
}

function getDatabaseTables(databaseUrl) {
  try {
    const result = execCommand(
      `psql "${databaseUrl}" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"`,
      { silent: true, encoding: 'utf8' }
    );

    return result.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } catch (error) {
    console.warn('⚠️  Could not retrieve table list');
    return [];
  }
}

function getSchemaVersion() {
  try {
    const drizzleDir = path.join(process.cwd(), 'apps', 'backend', 'drizzle');
    const metaPath = path.join(drizzleDir, 'meta');

    if (fs.existsSync(metaPath)) {
      const files = fs.readdirSync(metaPath)
        .filter(file => file.endsWith('.json'))
        .sort()
        .reverse();

      return files[0] || 'unknown';
    }

    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

async function createConfigBackup() {
  console.log('⚙️  Creating configuration backup...');

  const backupDir = ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `config-${timestamp}`;

  const configFiles = [
    'vercel.json',
    'package.json',
    'turbo.json',
    '.gitignore',
    '.env.production.template',
    'apps/frontend/package.json',
    'apps/frontend/next.config.js',
    'apps/frontend/tailwind.config.js',
    'apps/frontend/tsconfig.json',
    'apps/backend/package.json',
    'apps/backend/drizzle.config.ts'
  ];

  const configBackupDir = path.join(backupDir, 'config', backupName);
  fs.mkdirSync(configBackupDir, { recursive: true });

  let backedUpFiles = 0;

  configFiles.forEach(file => {
    const sourcePath = path.join(process.cwd(), file);
    if (fs.existsSync(sourcePath)) {
      const destPath = path.join(configBackupDir, file);
      const destDir = path.dirname(destPath);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.copyFileSync(sourcePath, destPath);
      backedUpFiles++;
    }
  });

  // Create archive
  execCommand(`cd "${backupDir}/config" && tar -czf "${backupName}.tar.gz" "${backupName}"`);

  // Remove uncompressed directory
  execCommand(`rm -rf "${configBackupDir}"`);

  const archivePath = path.join(backupDir, 'config', `${backupName}.tar.gz`);
  const stats = fs.statSync(archivePath);
  const fileSizeInKB = (stats.size / 1024).toFixed(2);

  console.log(`✅ Configuration backup created: ${backupName}.tar.gz (${fileSizeInKB} KB, ${backedUpFiles} files)`);

  return {
    path: archivePath,
    filesCount: backedUpFiles
  };
}

async function createCodeBackup() {
  console.log('📝 Creating code backup...');

  const backupDir = ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `code-${timestamp}`;

  try {
    // Get current git commit
    const commitHash = execCommand('git rev-parse HEAD', { silent: true, encoding: 'utf8' }).trim();
    const branchName = execCommand('git rev-parse --abbrev-ref HEAD', { silent: true, encoding: 'utf8' }).trim();

    // Create git bundle (includes full history)
    const bundlePath = path.join(backupDir, 'code', `${backupName}.bundle`);
    execCommand(`git bundle create "${bundlePath}" HEAD`);

    // Create source code archive (current state only)
    const archivePath = path.join(backupDir, 'code', `${backupName}.tar.gz`);
    execCommand(`git archive --format=tar.gz --output="${archivePath}" HEAD`);

    const bundleStats = fs.statSync(bundlePath);
    const archiveStats = fs.statSync(archivePath);

    console.log(`✅ Code backup created:`);
    console.log(`  Bundle: ${path.basename(bundlePath)} (${(bundleStats.size / (1024 * 1024)).toFixed(2)} MB)`);
    console.log(`  Archive: ${path.basename(archivePath)} (${(archiveStats.size / (1024 * 1024)).toFixed(2)} MB)`);
    console.log(`  Commit: ${commitHash} (${branchName})`);

    // Create metadata
    const metadata = {
      commit: commitHash,
      branch: branchName,
      timestamp: new Date().toISOString(),
      bundleSize: bundleStats.size,
      archiveSize: archiveStats.size
    };

    fs.writeFileSync(
      path.join(backupDir, 'code', `${backupName}.metadata.json`),
      JSON.stringify(metadata, null, 2)
    );

    return {
      bundlePath,
      archivePath,
      metadata
    };

  } catch (error) {
    console.error('❌ Code backup failed:', error.message);
    return null;
  }
}

async function restoreDatabase(backupPath, targetEnvironment = 'local') {
  console.log(`🔄 Restoring database from ${path.basename(backupPath)}...`);

  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found');
    return false;
  }

  // Get target database URL
  let targetDatabaseUrl;

  if (targetEnvironment === 'local') {
    targetDatabaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/studyteddy';
  } else {
    const envPath = path.join(process.cwd(), 'apps', 'frontend', `.env.${targetEnvironment}.local`);
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/DIRECT_DATABASE_URL=(.+)/);
      if (match) {
        targetDatabaseUrl = match[1].trim();
      }
    }
  }

  if (!targetDatabaseUrl) {
    console.error('❌ Target database URL not found');
    return false;
  }

  const confirmRestore = await question(`⚠️  This will overwrite the ${targetEnvironment} database. Continue? (y/n): `);
  if (confirmRestore.toLowerCase() !== 'y') {
    console.log('❌ Restore cancelled');
    return false;
  }

  try {
    // Decompress if needed
    let sqlPath = backupPath;
    if (backupPath.endsWith('.gz')) {
      console.log('📦 Decompressing backup...');
      execCommand(`gunzip -c "${backupPath}" > "${backupPath.replace('.gz', '')}"`);
      sqlPath = backupPath.replace('.gz', '');
    }

    // Drop existing database (be careful!)
    console.log('🗑️  Dropping existing database...');
    const dbName = new URL(targetDatabaseUrl).pathname.slice(1);
    const baseUrl = targetDatabaseUrl.replace(`/${dbName}`, '/postgres');

    execCommand(`psql "${baseUrl}" -c "DROP DATABASE IF EXISTS ${dbName};"`, { allowFailure: true });
    execCommand(`psql "${baseUrl}" -c "CREATE DATABASE ${dbName};"`);

    // Restore database
    console.log('📥 Restoring database...');
    execCommand(`psql "${targetDatabaseUrl}" < "${sqlPath}"`);

    // Clean up decompressed file if we created it
    if (sqlPath !== backupPath) {
      fs.unlinkSync(sqlPath);
    }

    console.log('✅ Database restore completed');
    return true;

  } catch (error) {
    console.error('❌ Database restore failed:', error.message);
    return false;
  }
}

async function listBackups() {
  console.log('📋 Available backups:');

  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    console.log('  No backups found');
    return;
  }

  // List database backups
  const dbBackupDir = path.join(backupDir, 'database');
  if (fs.existsSync(dbBackupDir)) {
    console.log('\n🗄️  Database Backups:');
    const dbBackups = fs.readdirSync(dbBackupDir)
      .filter(file => file.endsWith('.sql.gz'))
      .sort()
      .reverse();

    if (dbBackups.length === 0) {
      console.log('  No database backups found');
    } else {
      dbBackups.slice(0, 10).forEach((backup, index) => {
        const filePath = path.join(dbBackupDir, backup);
        const stats = fs.statSync(filePath);
        const size = (stats.size / (1024 * 1024)).toFixed(2);
        const date = stats.mtime.toLocaleString();

        console.log(`  ${index + 1}. ${backup} (${size} MB, ${date})`);
      });

      if (dbBackups.length > 10) {
        console.log(`  ... and ${dbBackups.length - 10} more`);
      }
    }
  }

  // List config backups
  const configBackupDir = path.join(backupDir, 'config');
  if (fs.existsSync(configBackupDir)) {
    console.log('\n⚙️  Configuration Backups:');
    const configBackups = fs.readdirSync(configBackupDir)
      .filter(file => file.endsWith('.tar.gz'))
      .sort()
      .reverse()
      .slice(0, 5);

    if (configBackups.length === 0) {
      console.log('  No configuration backups found');
    } else {
      configBackups.forEach((backup, index) => {
        const filePath = path.join(configBackupDir, backup);
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024).toFixed(2);
        const date = stats.mtime.toLocaleString();

        console.log(`  ${index + 1}. ${backup} (${size} KB, ${date})`);
      });
    }
  }
}

async function cleanupOldBackups() {
  console.log('🧹 Cleaning up old backups...');

  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    console.log('  No backup directory found');
    return;
  }

  const retentionDays = 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  let deletedCount = 0;
  let freedSpace = 0;

  // Clean database backups
  const dbBackupDir = path.join(backupDir, 'database');
  if (fs.existsSync(dbBackupDir)) {
    const files = fs.readdirSync(dbBackupDir);

    files.forEach(file => {
      const filePath = path.join(dbBackupDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtime < cutoffDate) {
        freedSpace += stats.size;
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`  Deleted: ${file}`);
      }
    });
  }

  // Clean config backups (keep more, they're smaller)
  const configBackupDir = path.join(backupDir, 'config');
  if (fs.existsSync(configBackupDir)) {
    const files = fs.readdirSync(configBackupDir)
      .filter(file => file.endsWith('.tar.gz'))
      .sort()
      .reverse();

    // Keep only last 20 config backups
    files.slice(20).forEach(file => {
      const filePath = path.join(configBackupDir, file);
      const stats = fs.statSync(filePath);
      freedSpace += stats.size;
      fs.unlinkSync(filePath);
      deletedCount++;
      console.log(`  Deleted: ${file}`);
    });
  }

  const freedSpaceMB = (freedSpace / (1024 * 1024)).toFixed(2);
  console.log(`✅ Cleanup completed: ${deletedCount} files deleted, ${freedSpaceMB} MB freed`);
}

async function createScheduledBackup() {
  console.log('⏰ Creating scheduled backup...');

  const timestamp = new Date().toISOString();
  console.log(`Started at: ${timestamp}`);

  const results = {
    timestamp,
    database: null,
    config: null,
    code: null,
    success: false
  };

  try {
    // Create all backups
    results.database = await createDatabaseBackup('production');
    results.config = await createConfigBackup();
    results.code = await createCodeBackup();

    // Clean up old backups
    await cleanupOldBackups();

    results.success = !!(results.database && results.config && results.code);

    // Save backup report
    const reportPath = path.join(ensureBackupDir(), 'logs', `backup-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    if (results.success) {
      console.log('\n🎉 Scheduled backup completed successfully!');
    } else {
      console.log('\n⚠️  Scheduled backup completed with some failures');
    }

    return results;

  } catch (error) {
    console.error('\n❌ Scheduled backup failed:', error.message);
    results.error = error.message;

    const reportPath = path.join(ensureBackupDir(), 'logs', `backup-error-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    return results;
  }
}

async function main() {
  console.log('🔄 StudyTeddy Backup & Restore Tool\n');

  if (process.argv.length < 3) {
    console.log('Usage:');
    console.log('  bun scripts/backup-restore.js <command> [options]');
    console.log('\nCommands:');
    console.log('  backup-db [environment]     - Create database backup');
    console.log('  backup-config               - Create configuration backup');
    console.log('  backup-code                 - Create code backup');
    console.log('  backup-all                  - Create complete backup');
    console.log('  restore-db <path> [env]     - Restore database from backup');
    console.log('  list                        - List available backups');
    console.log('  cleanup                     - Remove old backups');
    console.log('  scheduled                   - Run scheduled backup');
    process.exit(0);
  }

  const command = process.argv[2];

  try {
    switch (command) {
      case 'backup-db':
        const environment = process.argv[3] || 'production';
        await createDatabaseBackup(environment);
        break;

      case 'backup-config':
        await createConfigBackup();
        break;

      case 'backup-code':
        await createCodeBackup();
        break;

      case 'backup-all':
        console.log('🎯 Creating complete backup...');
        await createDatabaseBackup('production');
        await createConfigBackup();
        await createCodeBackup();
        console.log('✅ Complete backup finished');
        break;

      case 'restore-db':
        const backupPath = process.argv[3];
        const targetEnv = process.argv[4] || 'local';
        if (!backupPath) {
          console.error('❌ Backup path required');
          process.exit(1);
        }
        await restoreDatabase(backupPath, targetEnv);
        break;

      case 'list':
        await listBackups();
        break;

      case 'cleanup':
        await cleanupOldBackups();
        break;

      case 'scheduled':
        await createScheduledBackup();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Operation failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createDatabaseBackup,
  restoreDatabase,
  createConfigBackup,
  createCodeBackup,
  cleanupOldBackups
};