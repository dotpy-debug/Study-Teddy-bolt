#!/bin/bash
# ===========================================
# Study Teddy Backup Script
# ===========================================

set -e

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
POSTGRES_BACKUP="$BACKUP_DIR/postgres_$DATE.sql"
REDIS_BACKUP="$BACKUP_DIR/redis_$DATE.rdb"
RETENTION_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting backup process at $(date)"

# Backup PostgreSQL
echo "📊 Backing up PostgreSQL database..."
pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$POSTGRES_BACKUP"
gzip "$POSTGRES_BACKUP"
echo "✅ PostgreSQL backup completed: ${POSTGRES_BACKUP}.gz"

# Backup Redis
echo "🗄️  Backing up Redis data..."
redis-cli -h "$REDIS_HOST" -a "$REDIS_PASSWORD" --no-auth-warning --rdb "$REDIS_BACKUP"
gzip "$REDIS_BACKUP"
echo "✅ Redis backup completed: ${REDIS_BACKUP}.gz"

# Cleanup old backups
echo "🧹 Cleaning up old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete
echo "✅ Cleanup completed"

# Backup summary
echo "📋 Backup Summary:"
echo "   PostgreSQL: $(du -h ${POSTGRES_BACKUP}.gz | cut -f1)"
echo "   Redis: $(du -h ${REDIS_BACKUP}.gz | cut -f1)"
echo "   Total backups: $(ls -1 $BACKUP_DIR/*.gz | wc -l)"

echo "🎉 Backup process completed successfully at $(date)"

# Health check
if [ -f "${POSTGRES_BACKUP}.gz" ] && [ -f "${REDIS_BACKUP}.gz" ]; then
    exit 0
else
    echo "❌ Backup verification failed"
    exit 1
fi