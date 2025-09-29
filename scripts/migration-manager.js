#!/usr/bin/env node

/**
 * Migration Manager for StudyTeddy
 *
 * This script manages database migrations and schema changes:
 * - Safe migration execution
 * - Rollback capabilities
 * - Migration validation
 * - Zero-downtime deployment support
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

function getDrizzlePath() {
  return path.join(process.cwd(), 'apps', 'backend');
}

function getMigrationsPath() {
  return path.join(getDrizzlePath(), 'drizzle', 'migrations');
}

function getCurrentMigrations() {
  const migrationsPath = getMigrationsPath();

  if (!fs.existsSync(migrationsPath)) {
    return [];
  }

  return fs.readdirSync(migrationsPath)
    .filter(file => file.endsWith('.sql'))
    .sort();
}

function getPendingMigrations(appliedMigrations) {
  const allMigrations = getCurrentMigrations();
  return allMigrations.filter(migration => !appliedMigrations.includes(migration));
}

async function getAppliedMigrations(databaseUrl) {
  try {
    const result = execCommand(
      `psql "${databaseUrl}" -t -c "SELECT name FROM __drizzle_migrations ORDER BY id;"`,
      { silent: true, encoding: 'utf8' }
    );

    return result.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } catch (error) {
    console.warn('⚠️  Could not retrieve applied migrations (table might not exist)');
    return [];
  }
}

async function validateMigration(migrationFile) {
  console.log(`🔍 Validating migration: ${migrationFile}`);

  const migrationPath = path.join(getMigrationsPath(), migrationFile);
  const migrationContent = fs.readFileSync(migrationPath, 'utf8');

  const validationResults = {
    file: migrationFile,
    valid: true,
    warnings: [],
    errors: []
  };

  // Check for destructive operations
  const destructivePatterns = [
    /DROP\s+TABLE/i,
    /DROP\s+COLUMN/i,
    /DROP\s+INDEX/i,
    /TRUNCATE/i,
    /DELETE\s+FROM/i
  ];

  destructivePatterns.forEach(pattern => {
    if (pattern.test(migrationContent)) {
      validationResults.warnings.push(`Potentially destructive operation detected: ${pattern.source}`);
    }
  });

  // Check for missing rollback strategy
  if (!migrationContent.includes('-- Rollback:') && validationResults.warnings.length > 0) {
    validationResults.warnings.push('No rollback strategy documented for destructive operations');
  }

  // Check for large table modifications
  const largeTablePatterns = [
    /ALTER\s+TABLE\s+users/i,
    /ALTER\s+TABLE\s+study_tasks/i,
    /ALTER\s+TABLE\s+ai_chats/i
  ];

  largeTablePatterns.forEach(pattern => {
    if (pattern.test(migrationContent)) {
      validationResults.warnings.push(`Migration affects large table: ${pattern.source}`);
    }
  });

  // Check for syntax issues
  if (!migrationContent.trim().endsWith(';')) {
    validationResults.errors.push('Migration does not end with semicolon');
  }

  // Report results
  if (validationResults.errors.length > 0) {
    validationResults.valid = false;
    console.log('❌ Migration validation failed:');
    validationResults.errors.forEach(error => console.log(`  - ${error}`));
  }

  if (validationResults.warnings.length > 0) {
    console.log('⚠️  Migration warnings:');
    validationResults.warnings.forEach(warning => console.log(`  - ${warning}`));
  }

  if (validationResults.valid && validationResults.warnings.length === 0) {
    console.log('✅ Migration validation passed');
  }

  return validationResults;
}

async function createMigrationBackup(databaseUrl, migrationName) {
  console.log('💾 Creating pre-migration backup...');

  const backupDir = path.join(process.cwd(), 'backups', 'migrations');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `pre-migration-${migrationName.replace('.sql', '')}-${timestamp}`;
  const backupPath = path.join(backupDir, `${backupName}.sql`);

  try {
    execCommand(`pg_dump "${databaseUrl}" > "${backupPath}"`, { silent: true });
    execCommand(`gzip "${backupPath}"`);

    const compressedPath = `${backupPath}.gz`;
    const stats = fs.statSync(compressedPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Backup created: ${path.basename(compressedPath)} (${fileSizeInMB} MB)`);
    return compressedPath;

  } catch (error) {
    console.error('❌ Backup creation failed:', error.message);
    throw error;
  }
}

async function executeMigration(migrationFile, databaseUrl, options = {}) {
  console.log(`🚀 Executing migration: ${migrationFile}`);

  const migrationPath = path.join(getMigrationsPath(), migrationFile);

  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationFile}`);
  }

  try {
    const startTime = Date.now();

    // Execute the migration
    execCommand(`psql "${databaseUrl}" -f "${migrationPath}"`);

    const duration = Date.now() - startTime;
    console.log(`✅ Migration executed successfully in ${duration}ms`);

    // Record migration in database
    const migrationName = path.basename(migrationFile, '.sql');
    execCommand(
      `psql "${databaseUrl}" -c "INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('${migrationName}', NOW());"`,
      { allowFailure: true }
    );

    return {
      success: true,
      duration,
      migration: migrationFile
    };

  } catch (error) {
    console.error(`❌ Migration failed: ${error.message}`);
    throw error;
  }
}

async function rollbackMigration(migrationFile, databaseUrl) {
  console.log(`🔄 Rolling back migration: ${migrationFile}`);

  const migrationPath = path.join(getMigrationsPath(), migrationFile);
  const migrationContent = fs.readFileSync(migrationPath, 'utf8');

  // Look for rollback instructions
  const rollbackMatch = migrationContent.match(/-- Rollback:\s*([\s\S]*?)(?=\n--|$)/i);

  if (!rollbackMatch) {
    console.error('❌ No rollback instructions found in migration');
    console.log('💡 Manual rollback required');
    return false;
  }

  const rollbackSQL = rollbackMatch[1].trim();

  if (!rollbackSQL) {
    console.error('❌ Empty rollback instructions');
    return false;
  }

  const confirmRollback = await question(`⚠️  Execute rollback SQL? This cannot be undone. (y/n): `);
  if (confirmRollback.toLowerCase() !== 'y') {
    console.log('❌ Rollback cancelled');
    return false;
  }

  try {
    // Create backup before rollback
    await createMigrationBackup(databaseUrl, `rollback-${migrationFile}`);

    // Execute rollback
    const tempFile = path.join('/tmp', `rollback-${Date.now()}.sql`);
    fs.writeFileSync(tempFile, rollbackSQL);

    execCommand(`psql "${databaseUrl}" -f "${tempFile}"`);
    fs.unlinkSync(tempFile);

    // Remove migration from tracking table
    const migrationName = path.basename(migrationFile, '.sql');
    execCommand(
      `psql "${databaseUrl}" -c "DELETE FROM __drizzle_migrations WHERE hash = '${migrationName}';"`,
      { allowFailure: true }
    );

    console.log('✅ Migration rolled back successfully');
    return true;

  } catch (error) {
    console.error(`❌ Rollback failed: ${error.message}`);
    throw error;
  }
}

async function runMigrations(databaseUrl, options = {}) {
  console.log('🔄 Running database migrations...');

  // Ensure migrations table exists
  try {
    execCommand(
      `psql "${databaseUrl}" -c "CREATE TABLE IF NOT EXISTS __drizzle_migrations (id SERIAL PRIMARY KEY, hash VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT NOW());"`,
      { silent: true }
    );
  } catch (error) {
    console.error('❌ Could not create migrations table');
    throw error;
  }

  // Get migration status
  const appliedMigrations = await getAppliedMigrations(databaseUrl);
  const pendingMigrations = getPendingMigrations(appliedMigrations);

  console.log(`📊 Migration Status:`);
  console.log(`  Applied: ${appliedMigrations.length} migrations`);
  console.log(`  Pending: ${pendingMigrations.length} migrations`);

  if (pendingMigrations.length === 0) {
    console.log('✅ Database is up to date');
    return { success: true, executed: [] };
  }

  console.log('\n📋 Pending migrations:');
  pendingMigrations.forEach((migration, index) => {
    console.log(`  ${index + 1}. ${migration}`);
  });

  // Validate all pending migrations
  console.log('\n🔍 Validating migrations...');
  let hasErrors = false;

  for (const migration of pendingMigrations) {
    const validation = await validateMigration(migration);
    if (!validation.valid) {
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\n❌ Migration validation failed. Please fix errors before proceeding.');
    return { success: false, executed: [] };
  }

  // Confirm execution
  if (!options.autoConfirm) {
    const confirmMigration = await question('\n🚀 Execute pending migrations? (y/n): ');
    if (confirmMigration.toLowerCase() !== 'y') {
      console.log('❌ Migration cancelled');
      return { success: false, executed: [] };
    }
  }

  // Create backup before migration
  if (options.createBackup !== false) {
    await createMigrationBackup(databaseUrl, 'bulk-migration');
  }

  // Execute migrations
  const executedMigrations = [];
  let allSuccessful = true;

  for (const migration of pendingMigrations) {
    try {
      const result = await executeMigration(migration, databaseUrl, options);
      executedMigrations.push(result);
    } catch (error) {
      console.error(`❌ Failed to execute ${migration}: ${error.message}`);
      allSuccessful = false;

      if (options.stopOnError !== false) {
        break;
      }
    }
  }

  console.log(`\n📊 Migration Results:`);
  console.log(`  Executed: ${executedMigrations.length} migrations`);
  console.log(`  Success: ${allSuccessful ? 'Yes' : 'No'}`);

  return {
    success: allSuccessful,
    executed: executedMigrations
  };
}

async function generateMigration() {
  console.log('📝 Generating new migration...');

  const drizzlePath = getDrizzlePath();

  try {
    execCommand('bun db:generate', { cwd: drizzlePath });
    console.log('✅ Migration generated successfully');

    // List new migrations
    const migrations = getCurrentMigrations();
    if (migrations.length > 0) {
      const latestMigration = migrations[migrations.length - 1];
      console.log(`📄 Latest migration: ${latestMigration}`);

      // Validate the generated migration
      await validateMigration(latestMigration);
    }

  } catch (error) {
    console.error('❌ Migration generation failed:', error.message);
    throw error;
  }
}

async function getMigrationStatus(databaseUrl) {
  console.log('📊 Migration Status Report');

  try {
    const appliedMigrations = await getAppliedMigrations(databaseUrl);
    const allMigrations = getCurrentMigrations();
    const pendingMigrations = getPendingMigrations(appliedMigrations);

    console.log(`\n📈 Overall Status:`);
    console.log(`  Total migrations: ${allMigrations.length}`);
    console.log(`  Applied: ${appliedMigrations.length}`);
    console.log(`  Pending: ${pendingMigrations.length}`);
    console.log(`  Database: ${databaseUrl.includes('localhost') ? 'Local' : 'Remote'}`);

    if (appliedMigrations.length > 0) {
      console.log(`\n✅ Applied Migrations (last 5):`);
      appliedMigrations.slice(-5).forEach((migration, index) => {
        console.log(`  ${appliedMigrations.length - 4 + index}. ${migration}`);
      });
    }

    if (pendingMigrations.length > 0) {
      console.log(`\n⏳ Pending Migrations:`);
      pendingMigrations.forEach((migration, index) => {
        console.log(`  ${index + 1}. ${migration}`);
      });
    } else {
      console.log('\n✅ Database is up to date');
    }

    // Check schema version
    const latestMigration = allMigrations[allMigrations.length - 1];
    const isUpToDate = appliedMigrations.includes(latestMigration);

    console.log(`\n🎯 Status: ${isUpToDate ? 'UP TO DATE' : 'NEEDS MIGRATION'}`);

    return {
      total: allMigrations.length,
      applied: appliedMigrations.length,
      pending: pendingMigrations.length,
      upToDate: isUpToDate
    };

  } catch (error) {
    console.error('❌ Could not get migration status:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🔄 StudyTeddy Migration Manager\n');

  if (process.argv.length < 3) {
    console.log('Usage:');
    console.log('  bun scripts/migration-manager.js <command> [options]');
    console.log('\nCommands:');
    console.log('  generate                    - Generate new migration from schema changes');
    console.log('  migrate [db-url]           - Run pending migrations');
    console.log('  rollback <migration> [db]  - Rollback specific migration');
    console.log('  status [db-url]           - Show migration status');
    console.log('  validate <migration>       - Validate specific migration');
    console.log('  list                       - List all migrations');
    process.exit(0);
  }

  const command = process.argv[2];

  try {
    switch (command) {
      case 'generate':
        await generateMigration();
        break;

      case 'migrate':
        const migrateDbUrl = process.argv[3] || process.env.DATABASE_URL;
        if (!migrateDbUrl) {
          console.error('❌ Database URL required');
          process.exit(1);
        }
        await runMigrations(migrateDbUrl);
        break;

      case 'rollback':
        const migrationFile = process.argv[3];
        const rollbackDbUrl = process.argv[4] || process.env.DATABASE_URL;
        if (!migrationFile || !rollbackDbUrl) {
          console.error('❌ Migration file and database URL required');
          process.exit(1);
        }
        await rollbackMigration(migrationFile, rollbackDbUrl);
        break;

      case 'status':
        const statusDbUrl = process.argv[3] || process.env.DATABASE_URL;
        if (!statusDbUrl) {
          console.error('❌ Database URL required');
          process.exit(1);
        }
        await getMigrationStatus(statusDbUrl);
        break;

      case 'validate':
        const validateFile = process.argv[3];
        if (!validateFile) {
          console.error('❌ Migration file required');
          process.exit(1);
        }
        await validateMigration(validateFile);
        break;

      case 'list':
        const migrations = getCurrentMigrations();
        console.log('📋 Available migrations:');
        if (migrations.length === 0) {
          console.log('  No migrations found');
        } else {
          migrations.forEach((migration, index) => {
            console.log(`  ${index + 1}. ${migration}`);
          });
        }
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
  runMigrations,
  rollbackMigration,
  validateMigration,
  getMigrationStatus,
  generateMigration
};