#!/bin/bash

# =============================================================================
# Redis Backup Script for Study Teddy
# Creates compressed backups with retention policy
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

# Backup file names
RDB_BACKUP_FILE="${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"
COMPRESSED_BACKUP_FILE="${BACKUP_DIR}/redis_${TIMESTAMP}.rdb.gz"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

log "Starting Redis backup for ${REDIS_HOST}:${REDIS_PORT}"

# Test Redis connection
if [[ -n "${REDIS_PASSWORD}" ]]; then
    REDIS_CLI_CMD="redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} -a ${REDIS_PASSWORD}"
else
    REDIS_CLI_CMD="redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT}"
fi

# Test connection
if ! ${REDIS_CLI_CMD} ping > /dev/null 2>&1; then
    log "ERROR: Cannot connect to Redis at ${REDIS_HOST}:${REDIS_PORT}"
    exit 1
fi

# Get Redis info
REDIS_VERSION=$(${REDIS_CLI_CMD} info server | grep redis_version | cut -d: -f2 | tr -d '\r')
DB_SIZE=$(${REDIS_CLI_CMD} dbsize | tr -d '\r')
MEMORY_USAGE=$(${REDIS_CLI_CMD} info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')

log "Redis version: ${REDIS_VERSION}"
log "Database size: ${DB_SIZE} keys"
log "Memory usage: ${MEMORY_USAGE}"

# Force Redis to save current state
log "Forcing Redis BGSAVE..."
if ${REDIS_CLI_CMD} bgsave | grep -q "Background saving started"; then
    log "Background save initiated"

    # Wait for background save to complete
    while ${REDIS_CLI_CMD} lastsave | read -r lastsave_time; do
        sleep 1
        current_time=$(${REDIS_CLI_CMD} lastsave)
        if [[ "${current_time}" != "${lastsave_time}" ]]; then
            break
        fi
        sleep 2
    done
    log "Background save completed"
else
    log "ERROR: Failed to initiate background save"
    exit 1
fi

# Copy the RDB file from Redis container
# Note: This assumes Redis is running in a container and we can access its volume
# In production, you might need to adjust this based on your setup

# Alternative approach: Use SAVE command (blocks Redis)
# log "Creating Redis backup using SAVE command..."
# if ${REDIS_CLI_CMD} save > /dev/null 2>&1; then
#     log "Redis SAVE completed"
# else
#     log "ERROR: Redis SAVE failed"
#     exit 1
# fi

# Create backup using redis-cli --rdb
log "Creating RDB backup..."
if [[ -n "${REDIS_PASSWORD}" ]]; then
    redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" --rdb "${RDB_BACKUP_FILE}"
else
    redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" --rdb "${RDB_BACKUP_FILE}"
fi

# Verify backup file was created
if [[ -f "${RDB_BACKUP_FILE}" ]]; then
    log "RDB backup created successfully: ${RDB_BACKUP_FILE}"
else
    log "ERROR: RDB backup file not found"
    exit 1
fi

# Compress the backup
log "Compressing backup..."
if gzip "${RDB_BACKUP_FILE}"; then
    log "Backup compressed successfully: ${COMPRESSED_BACKUP_FILE}"
else
    log "ERROR: Failed to compress backup"
    exit 1
fi

# Verify compressed backup file
if [[ -f "${COMPRESSED_BACKUP_FILE}" ]]; then
    BACKUP_SIZE=$(stat -f%z "${COMPRESSED_BACKUP_FILE}" 2>/dev/null || stat -c%s "${COMPRESSED_BACKUP_FILE}" 2>/dev/null || echo "unknown")
    log "Backup file size: ${BACKUP_SIZE} bytes"
else
    log "ERROR: Compressed backup file not found"
    exit 1
fi

# Clean up old backups
log "Cleaning up old backups (retention: ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "redis_*.rdb.gz" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# Count remaining backups
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "redis_*.rdb.gz" -type f | wc -l)
log "Total Redis backups in directory: ${BACKUP_COUNT}"

# Create backup manifest
MANIFEST_FILE="${BACKUP_DIR}/redis_backup_manifest.txt"
{
    echo "# Study Teddy Redis Backup Manifest"
    echo "# Last updated: $(date)"
    echo "# Redis host: ${REDIS_HOST}:${REDIS_PORT}"
    echo "# Redis version: ${REDIS_VERSION}"
    echo "# Database size: ${DB_SIZE} keys"
    echo "# Memory usage: ${MEMORY_USAGE}"
    echo ""
    echo "# Available backups:"
    find "${BACKUP_DIR}" -name "redis_*.rdb.gz" -type f -exec basename {} \; | sort -r
} > "${MANIFEST_FILE}"

log "Redis backup manifest updated: ${MANIFEST_FILE}"

# Optional: Test backup integrity
log "Testing backup integrity..."
if gunzip -t "${COMPRESSED_BACKUP_FILE}" 2>/dev/null; then
    log "Backup compression integrity verified"
else
    log "WARNING: Backup compression integrity check failed"
fi

log "Redis backup completed successfully: ${COMPRESSED_BACKUP_FILE}"

# Optional: Send notification (uncomment and configure as needed)
# if command -v curl > /dev/null 2>&1 && [[ -n "${WEBHOOK_URL:-}" ]]; then
#     curl -X POST "${WEBHOOK_URL}" \
#         -H "Content-Type: application/json" \
#         -d "{\"text\":\"Redis backup completed: ${COMPRESSED_BACKUP_FILE} (${DB_SIZE} keys)\"}" \
#         > /dev/null 2>&1 || log "Failed to send notification"
# fi

exit 0