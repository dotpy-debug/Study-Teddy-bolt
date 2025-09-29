#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { DrizzleService } from '../src/db/drizzle.service';
import { DbModule } from '../src/db/db.module';
import { sql } from 'drizzle-orm';

async function optimizeDatabase() {
  console.log('🚀 Starting database optimization...');

  // Create NestJS application context to access services
  const app = await NestFactory.createApplicationContext(DbModule);
  const drizzleService = app.get(DrizzleService);
  const db = drizzleService.db;

  try {
    // 1. Create performance indexes
    console.log('📊 Creating performance indexes...');
    
    const indexes = [
      // Composite index for task queries
      {
        name: 'idx_study_tasks_user_completed_due_date',
        sql: sql`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_tasks_user_completed_due_date 
          ON study_tasks (user_id, completed, due_date DESC);
        `,
      },
      // Composite index for session analytics
      {
        name: 'idx_study_sessions_user_date',
        sql: sql`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_sessions_user_date 
          ON study_sessions (user_id, date DESC);
        `,
      },
      // Partial index for active tasks
      {
        name: 'idx_study_tasks_active',
        sql: sql`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_tasks_active 
          ON study_tasks (user_id, due_date) 
          WHERE completed = false;
        `,
      },
      // Index for AI chat history
      {
        name: 'idx_ai_chats_user_created',
        sql: sql`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_chats_user_created 
          ON ai_chats (user_id, created_at DESC);
        `,
      },
      // Index for user authentication
      {
        name: 'idx_users_email_provider',
        sql: sql`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_provider 
          ON users (email, auth_provider);
        `,
      },
    ];

    for (const index of indexes) {
      try {
        await db.execute(index.sql);
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        console.log(`⚠️  Index ${index.name} already exists or failed:`, error.message);
      }
    }

    // 2. Update table statistics
    console.log('📈 Updating table statistics...');
    await db.execute(sql`ANALYZE;`);
    console.log('✅ Table statistics updated');

    // 3. Check for unused indexes
    console.log('🔍 Checking for unused indexes...');
    const unusedIndexes = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND idx_scan = 0
      ORDER BY tablename, indexname;
    `);

    if (unusedIndexes.length > 0) {
      console.log('⚠️  Found unused indexes:');
      unusedIndexes.forEach((index: any) => {
        console.log(`   - ${index.indexname} on ${index.tablename}`);
      });
    } else {
      console.log('✅ No unused indexes found');
    }

    // 4. Check table sizes
    console.log('📏 Checking table sizes...');
    const tableSizes = await db.execute(sql`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    `);

    console.log('📊 Table sizes:');
    tableSizes.forEach((table: any) => {
      console.log(`   - ${table.tablename}: ${table.size}`);
    });

    // 5. Check connection statistics
    console.log('🔗 Checking connection statistics...');
    const connectionStats = await db.execute(sql`
      SELECT 
        state,
        count(*) as count
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state;
    `);

    console.log('📊 Connection statistics:');
    connectionStats.forEach((stat: any) => {
      console.log(`   - ${stat.state}: ${stat.count} connections`);
    });

    // 6. Performance recommendations
    console.log('💡 Performance recommendations:');
    
    // Check for large tables without proper indexing
    const largeTablesWithLowIndexUsage = await db.execute(sql`
      SELECT 
        t.tablename,
        pg_size_pretty(pg_total_relation_size('public.'||t.tablename)) as size,
        COALESCE(SUM(i.idx_scan), 0) as total_index_scans
      FROM pg_tables t
      LEFT JOIN pg_stat_user_indexes i ON t.tablename = i.tablename
      WHERE t.schemaname = 'public'
        AND pg_total_relation_size('public.'||t.tablename) > 1000000
      GROUP BY t.tablename
      HAVING COALESCE(SUM(i.idx_scan), 0) < 100
      ORDER BY pg_total_relation_size('public.'||t.tablename) DESC;
    `);

    if (largeTablesWithLowIndexUsage.length > 0) {
      console.log('⚠️  Large tables with low index usage:');
      largeTablesWithLowIndexUsage.forEach((table: any) => {
        console.log(`   - ${table.tablename} (${table.size}): ${table.total_index_scans} index scans`);
      });
    }

    // 7. Vacuum and analyze for maintenance
    console.log('🧹 Running maintenance tasks...');
    await db.execute(sql`VACUUM ANALYZE;`);
    console.log('✅ Vacuum and analyze completed');

    console.log('🎉 Database optimization completed successfully!');

  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    process.exit(1);
  } finally {
    // Close the application context
    await app.close();
  }
}

// Run optimization if called directly
if (require.main === module) {
  optimizeDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Optimization failed:', error);
      process.exit(1);
    });
}

export { optimizeDatabase };