#!/usr/bin/env node

/**
 * Neon PostgreSQL Database Setup Script
 *
 * This script sets up a Neon PostgreSQL database for StudyTeddy with:
 * - Connection pooling configuration
 * - Production-ready settings
 * - SSL configuration
 * - Performance optimizations
 */

const { createInterface } = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupNeonDatabase() {
  console.log('🚀 StudyTeddy Neon Database Setup\n');

  try {
    // Check if user wants to use existing database or create new one
    const useExisting = await question('Do you have an existing Neon database? (y/n): ');

    let databaseUrl;
    let directUrl;

    if (useExisting.toLowerCase() === 'y') {
      console.log('\n📋 Please provide your Neon database details:');

      databaseUrl = await question('Pooled connection string (DATABASE_URL): ');
      directUrl = await question('Direct connection string (DIRECT_DATABASE_URL): ');
    } else {
      console.log('\n🌟 Setting up new Neon database...');
      console.log('Please follow these steps:');
      console.log('1. Go to https://neon.tech/');
      console.log('2. Create a new account or sign in');
      console.log('3. Create a new project');
      console.log('4. Create a database named "studyteddy"');
      console.log('5. Copy the connection strings\n');

      await question('Press Enter when you have completed the setup...');

      databaseUrl = await question('Pooled connection string (DATABASE_URL): ');
      directUrl = await question('Direct connection string (DIRECT_DATABASE_URL): ');
    }

    // Validate connection strings
    if (!databaseUrl || !directUrl) {
      throw new Error('Database connection strings are required');
    }

    if (!databaseUrl.includes('neon.tech') || !directUrl.includes('neon.tech')) {
      throw new Error('Invalid Neon database connection strings');
    }

    // Create environment file with database configuration
    const envContent = `
# =============================================
# NEON DATABASE CONFIGURATION
# =============================================

# Pooled connection for application use
DATABASE_URL=${databaseUrl}

# Direct connection for migrations and admin tasks
DIRECT_DATABASE_URL=${directUrl}

# Connection pool settings
DATABASE_POOL_SIZE=20
DATABASE_POOL_TIMEOUT=30000
DATABASE_IDLE_TIMEOUT=10000
DATABASE_MAX_LIFETIME=3600000

# SSL Configuration (required for Neon)
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true

# Connection settings
DATABASE_CONNECT_TIMEOUT=60000
DATABASE_QUERY_TIMEOUT=30000
DATABASE_STATEMENT_TIMEOUT=30000

# Performance settings
DATABASE_MAX_CONNECTIONS=100
DATABASE_MIN_CONNECTIONS=5
DATABASE_ACQUIRE_TIMEOUT=60000
DATABASE_CREATE_TIMEOUT=30000
DATABASE_DESTROY_TIMEOUT=5000
DATABASE_REAP_INTERVAL=1000
DATABASE_CREATE_RETRY_INTERVAL=200

# =============================================
# PRODUCTION OPTIMIZATIONS
# =============================================

# Enable connection pooling
PGBOUNCER_ENABLED=true
PGBOUNCER_POOL_MODE=transaction
PGBOUNCER_MAX_CLIENT_CONN=100
PGBOUNCER_DEFAULT_POOL_SIZE=20

# Query performance
ENABLE_QUERY_CACHE=true
QUERY_CACHE_SIZE=128
QUERY_CACHE_TTL=300

# Monitoring
ENABLE_DB_MONITORING=true
LOG_SLOW_QUERIES=true
SLOW_QUERY_THRESHOLD=1000
`;

    // Write to apps/frontend/.env.production.local
    const frontendEnvPath = path.join(process.cwd(), 'apps', 'frontend', '.env.production.local');
    let existingEnv = '';

    if (fs.existsSync(frontendEnvPath)) {
      existingEnv = fs.readFileSync(frontendEnvPath, 'utf8');
    }

    // Merge with existing environment variables
    const mergedEnv = existingEnv + envContent;
    fs.writeFileSync(frontendEnvPath, mergedEnv);

    // Also write to backend if it exists
    const backendEnvPath = path.join(process.cwd(), 'apps', 'backend', '.env.production');
    if (fs.existsSync(path.dirname(backendEnvPath))) {
      let backendEnv = '';
      if (fs.existsSync(backendEnvPath)) {
        backendEnv = fs.readFileSync(backendEnvPath, 'utf8');
      }
      fs.writeFileSync(backendEnvPath, backendEnv + envContent);
    }

    console.log('\n✅ Database configuration saved successfully!');

    // Test connection
    console.log('\n🔍 Testing database connection...');

    try {
      // Create a simple test script
      const testScript = `
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: '${databaseUrl}',
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful!');
    console.log('Server time:', result.rows[0].now);
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
`;

      fs.writeFileSync('/tmp/test-connection.js', testScript);
      execSync('node /tmp/test-connection.js', { stdio: 'inherit' });
      fs.unlinkSync('/tmp/test-connection.js');

    } catch (error) {
      console.warn('⚠️  Could not test connection automatically. Please test manually.');
    }

    // Run database migrations if they exist
    console.log('\n🔄 Running database migrations...');

    try {
      // Check if we have drizzle migrations
      const migrationsPath = path.join(process.cwd(), 'apps', 'backend', 'drizzle');
      if (fs.existsSync(migrationsPath)) {
        process.env.DATABASE_URL = directUrl;
        execSync('bun db:migrate', { stdio: 'inherit', cwd: process.cwd() });
        console.log('✅ Database migrations completed successfully!');
      } else {
        console.log('📝 No migrations found. Run "bun db:generate" to create initial schema.');
      }
    } catch (error) {
      console.warn('⚠️  Could not run migrations automatically:', error.message);
      console.log('💡 Run "bun db:migrate" manually after setup is complete.');
    }

    // Create database backup script
    createBackupScript(directUrl);

    console.log('\n🎉 Neon database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your Vercel environment variables');
    console.log('2. Test your application locally');
    console.log('3. Deploy to Vercel');
    console.log('4. Set up monitoring and alerts');

    console.log('\n🔗 Useful links:');
    console.log('- Neon Console: https://console.neon.tech/');
    console.log('- Connection Pooling: https://neon.tech/docs/connect/connection-pooling');
    console.log('- Performance Tips: https://neon.tech/docs/guides/performance-tips');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

function createBackupScript(directUrl) {
  const backupScript = `#!/bin/bash

# Neon Database Backup Script
# Usage: ./backup-database.sh [backup-name]

set -e

BACKUP_NAME=\${1:-"studyteddy-\$(date +%Y%m%d-%H%M%S)"}
BACKUP_DIR="./backups"
DATABASE_URL="${directUrl}"

# Create backup directory if it doesn't exist
mkdir -p "\$BACKUP_DIR"

echo "📦 Creating database backup: \$BACKUP_NAME"

# Export database schema and data
pg_dump "\$DATABASE_URL" > "\$BACKUP_DIR/\$BACKUP_NAME.sql"

# Compress the backup
gzip "\$BACKUP_DIR/\$BACKUP_NAME.sql"

echo "✅ Backup created: \$BACKUP_DIR/\$BACKUP_NAME.sql.gz"

# Clean up old backups (keep last 7 days)
find "\$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "🧹 Cleaned up old backups"
echo "📊 Current backups:"
ls -lh "\$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No backups found"
`;

  fs.writeFileSync(path.join(process.cwd(), 'scripts', 'backup-database.sh'), backupScript);
  execSync('chmod +x scripts/backup-database.sh');

  console.log('📦 Database backup script created at scripts/backup-database.sh');
}

// Run the setup
if (require.main === module) {
  setupNeonDatabase().catch(console.error);
}

module.exports = { setupNeonDatabase };