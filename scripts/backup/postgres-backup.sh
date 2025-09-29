#!/bin/bash

# =============================================================================
# PostgreSQL Backup Script for Study Teddy
# Creates compressed backups with retention policy
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
DB_NAME="${PGDATABASE:-studyteddy}"
DB_USER="${PGUSER:-studyteddy}"
DB_HOST="${PGHOST:-postgres}"
DB_PORT="${PGPORT:-5432}"

# Backup file names
SQL_BACKUP_FILE="${BACKUP_DIR}/studyteddy_${TIMESTAMP}.sql"
COMPRESSED_BACKUP_FILE="${BACKUP_DIR}/studyteddy_${TIMESTAMP}.sql.gz"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

log "Starting PostgreSQL backup for database: ${DB_NAME}"

# Test database connection
if ! pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
    log "ERROR: Cannot connect to database ${DB_NAME} on ${DB_HOST}:${DB_PORT}"
    exit 1
fi

# Create SQL backup
log "Creating SQL backup..."
if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --verbose \
    --clean \
    --create \
    --if-exists \
    --format=plain \
    --no-password \
    > "${SQL_BACKUP_FILE}"; then
    log "SQL backup created successfully: ${SQL_BACKUP_FILE}"
else
    log "ERROR: Failed to create SQL backup"
    exit 1
fi

# Compress the backup
log "Compressing backup..."
if gzip "${SQL_BACKUP_FILE}"; then
    log "Backup compressed successfully: ${COMPRESSED_BACKUP_FILE}"
else
    log "ERROR: Failed to compress backup"
    exit 1
fi

# Verify backup file
if [[ -f "${COMPRESSED_BACKUP_FILE}" ]]; then
    BACKUP_SIZE=$(stat -f%z "${COMPRESSED_BACKUP_FILE}" 2>/dev/null || stat -c%s "${COMPRESSED_BACKUP_FILE}" 2>/dev/null || echo "unknown")
    log "Backup file size: ${BACKUP_SIZE} bytes"
else
    log "ERROR: Backup file not found after compression"
    exit 1
fi

# Clean up old backups
log "Cleaning up old backups (retention: ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "studyteddy_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# Count remaining backups
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "studyteddy_*.sql.gz" -type f | wc -l)
log "Total backups in directory: ${BACKUP_COUNT}"

# Create backup manifest
MANIFEST_FILE="${BACKUP_DIR}/backup_manifest.txt"
{
    echo "# Study Teddy PostgreSQL Backup Manifest"
    echo "# Last updated: $(date)"
    echo "# Database: ${DB_NAME}"
    echo "# Host: ${DB_HOST}:${DB_PORT}"
    echo "# User: ${DB_USER}"
    echo ""
    echo "# Available backups:"
    find "${BACKUP_DIR}" -name "studyteddy_*.sql.gz" -type f -exec basename {} \; | sort -r
} > "${MANIFEST_FILE}"

log "Backup manifest updated: ${MANIFEST_FILE}"

# Optional: Test restore (uncomment for validation)
# log "Testing backup integrity..."
# TEST_DB="test_restore_$(date '+%s')"
# if createdb -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${TEST_DB}" 2>/dev/null; then
#     if gunzip -c "${COMPRESSED_BACKUP_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TEST_DB}" > /dev/null 2>&1; then
#         log "Backup integrity test passed"
#     else
#         log "WARNING: Backup integrity test failed"
#     fi
#     dropdb -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${TEST_DB}" 2>/dev/null || true
# fi

log "PostgreSQL backup completed successfully: ${COMPRESSED_BACKUP_FILE}"

# Optional: Send notification (uncomment and configure as needed)
# if command -v curl > /dev/null 2>&1 && [[ -n "${WEBHOOK_URL:-}" ]]; then
#     curl -X POST "${WEBHOOK_URL}" \
#         -H "Content-Type: application/json" \
#         -d "{\"text\":\"PostgreSQL backup completed: ${COMPRESSED_BACKUP_FILE}\"}" \
#         > /dev/null 2>&1 || log "Failed to send notification"
# fi

exit 0