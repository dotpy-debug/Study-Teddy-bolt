#!/bin/bash

# Docker Deployment Script for StudyTeddy
# Supports production, staging, and development environments
# Usage: ./deploy-docker.sh [environment] [strategy] [version]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_LOG="$PROJECT_ROOT/logs/deployment-$(date +%Y%m%d-%H%M%S).log"

# Ensure log directory exists
mkdir -p "$(dirname "$DEPLOY_LOG")"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$DEPLOY_LOG"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary resources..."
    docker system prune -f || true
}

trap cleanup EXIT

# Parse arguments
ENVIRONMENT=${1:-staging}
STRATEGY=${2:-rolling}
VERSION=${3:-latest}

log "Starting Docker deployment for StudyTeddy"
log "Environment: $ENVIRONMENT"
log "Strategy: $STRATEGY"
log "Version: $VERSION"

# Validate environment
case $ENVIRONMENT in
    production|staging|development|local)
        log "Valid environment: $ENVIRONMENT"
        ;;
    *)
        error_exit "Invalid environment: $ENVIRONMENT. Use: production, staging, development, or local"
        ;;
esac

# Validate strategy
case $STRATEGY in
    rolling|blue-green|recreate)
        log "Valid strategy: $STRATEGY"
        ;;
    *)
        error_exit "Invalid strategy: $STRATEGY. Use: rolling, blue-green, or recreate"
        ;;
esac

# Load environment variables
ENV_FILE="$PROJECT_ROOT/.env.$ENVIRONMENT"
if [[ -f "$ENV_FILE" ]]; then
    log "Loading environment variables from $ENV_FILE"
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    error_exit "Environment file not found: $ENV_FILE"
fi

# Validate required environment variables
required_vars=(
    "DATABASE_URL"
    "REDIS_URL"
    "JWT_SECRET"
    "NEXTAUTH_SECRET"
)

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        error_exit "Required environment variable $var is not set"
    fi
done

# Build images if needed
build_images() {
    log "Building Docker images..."

    # Build backend
    log "Building backend image..."
    docker build \
        --file "$PROJECT_ROOT/apps/backend/Dockerfile" \
        --tag "studyteddy-backend:$VERSION" \
        --build-arg VERSION="$VERSION" \
        --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --build-arg VCS_REF="$(git rev-parse HEAD)" \
        "$PROJECT_ROOT/apps/backend" || error_exit "Backend build failed"

    # Build frontend
    log "Building frontend image..."
    docker build \
        --file "$PROJECT_ROOT/apps/frontend/Dockerfile" \
        --tag "studyteddy-frontend:$VERSION" \
        --build-arg VERSION="$VERSION" \
        --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --build-arg VCS_REF="$(git rev-parse HEAD)" \
        --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
        "$PROJECT_ROOT/apps/frontend" || error_exit "Frontend build failed"

    log "Images built successfully"
}

# Health check function
health_check() {
    local service_name=$1
    local health_url=$2
    local max_attempts=30
    local attempt=1

    log "Running health check for $service_name at $health_url"

    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log "$service_name health check passed (attempt $attempt)"
            return 0
        fi

        log "$service_name health check failed (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done

    error_exit "$service_name health check failed after $max_attempts attempts"
}

# Rolling deployment strategy
deploy_rolling() {
    log "Executing rolling deployment..."

    # Update docker-compose file with new images
    sed -i.bak "s|studyteddy-backend:.*|studyteddy-backend:$VERSION|g" "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml"
    sed -i.bak "s|studyteddy-frontend:.*|studyteddy-frontend:$VERSION|g" "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml"

    # Deploy with rolling update
    docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" up -d --no-deps --scale backend=2 backend
    docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" up -d --no-deps --scale frontend=2 frontend

    # Health checks
    sleep 30
    health_check "Backend" "http://localhost:3001/health"
    health_check "Frontend" "http://localhost:3000"

    # Scale down old instances
    docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" up -d --scale backend=1 --scale frontend=1

    log "Rolling deployment completed successfully"
}

# Blue-green deployment strategy
deploy_blue_green() {
    log "Executing blue-green deployment..."

    # Determine current and new environments
    if docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" ps | grep -q "studyteddy.*green"; then
        CURRENT_COLOR="green"
        NEW_COLOR="blue"
    else
        CURRENT_COLOR="blue"
        NEW_COLOR="green"
    fi

    log "Current environment: $CURRENT_COLOR, New environment: $NEW_COLOR"

    # Create new environment compose file
    cp "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" "$PROJECT_ROOT/docker-compose.$ENVIRONMENT-$NEW_COLOR.yml"

    # Update service names and images for new color
    sed -i "s|studyteddy-backend|studyteddy-backend-$NEW_COLOR|g" "$PROJECT_ROOT/docker-compose.$ENVIRONMENT-$NEW_COLOR.yml"
    sed -i "s|studyteddy-frontend|studyteddy-frontend-$NEW_COLOR|g" "$PROJECT_ROOT/docker-compose.$ENVIRONMENT-$NEW_COLOR.yml"
    sed -i "s|studyteddy-backend:.*|studyteddy-backend:$VERSION|g" "$PROJECT_ROOT/docker-compose.$ENVIRONMENT-$NEW_COLOR.yml"
    sed -i "s|studyteddy-frontend:.*|studyteddy-frontend:$VERSION|g" "$PROJECT_ROOT/docker-compose.$ENVIRONMENT-$NEW_COLOR.yml"

    # Deploy new environment
    docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT-$NEW_COLOR.yml" up -d

    # Health checks on new environment
    sleep 30
    health_check "Backend ($NEW_COLOR)" "http://localhost:3001/health"
    health_check "Frontend ($NEW_COLOR)" "http://localhost:3000"

    # Switch traffic (update nginx config)
    if [[ -f "$PROJECT_ROOT/nginx/nginx.$ENVIRONMENT.conf" ]]; then
        sed -i.bak "s|backend-$CURRENT_COLOR|backend-$NEW_COLOR|g" "$PROJECT_ROOT/nginx/nginx.$ENVIRONMENT.conf"
        sed -i.bak "s|frontend-$CURRENT_COLOR|frontend-$NEW_COLOR|g" "$PROJECT_ROOT/nginx/nginx.$ENVIRONMENT.conf"

        # Reload nginx
        docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" exec nginx nginx -s reload
    fi

    # Wait for traffic switch to stabilize
    sleep 30

    # Final health check
    health_check "Backend (after switch)" "http://localhost:3001/health"
    health_check "Frontend (after switch)" "http://localhost:3000"

    # Stop old environment
    if [[ -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT-$CURRENT_COLOR.yml" ]]; then
        docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT-$CURRENT_COLOR.yml" down
        rm -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT-$CURRENT_COLOR.yml"
    fi

    # Cleanup
    rm -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT-$NEW_COLOR.yml"

    log "Blue-green deployment completed successfully"
}

# Recreate deployment strategy
deploy_recreate() {
    log "Executing recreate deployment..."

    # Stop all services
    docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" down

    # Update compose file with new images
    sed -i.bak "s|studyteddy-backend:.*|studyteddy-backend:$VERSION|g" "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml"
    sed -i.bak "s|studyteddy-frontend:.*|studyteddy-frontend:$VERSION|g" "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml"

    # Start all services
    docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" up -d

    # Health checks
    sleep 30
    health_check "Backend" "http://localhost:3001/health"
    health_check "Frontend" "http://localhost:3000"

    log "Recreate deployment completed successfully"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."

    # Check Docker daemon
    if ! docker info > /dev/null 2>&1; then
        error_exit "Docker daemon is not running"
    fi

    # Check available disk space (at least 5GB)
    available_space=$(df / | tail -1 | awk '{print $4}')
    required_space=5242880  # 5GB in KB

    if [[ $available_space -lt $required_space ]]; then
        error_exit "Insufficient disk space. Required: 5GB, Available: $(($available_space / 1024 / 1024))GB"
    fi

    # Check if required ports are available
    required_ports=(3000 3001 5432 6379)
    for port in "${required_ports[@]}"; do
        if netstat -ln | grep -q ":$port "; then
            log "WARNING: Port $port is already in use"
        fi
    done

    # Validate database connection
    log "Testing database connection..."
    if ! pg_isready -d "$DATABASE_URL" > /dev/null 2>&1; then
        error_exit "Cannot connect to database"
    fi

    # Validate Redis connection
    log "Testing Redis connection..."
    if ! redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
        error_exit "Cannot connect to Redis"
    fi

    log "Pre-deployment checks passed"
}

# Database migration
run_migrations() {
    log "Running database migrations..."

    # Run migrations using the backend container
    docker run --rm \
        -e DATABASE_URL="$DATABASE_URL" \
        -v "$PROJECT_ROOT/apps/backend:/app" \
        -w /app \
        "studyteddy-backend:$VERSION" \
        bun run db:migrate || error_exit "Database migration failed"

    log "Database migrations completed"
}

# Create backup before deployment
create_backup() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "Creating backup before production deployment..."

        # Database backup
        backup_file="$PROJECT_ROOT/backups/db-backup-$(date +%Y%m%d-%H%M%S).sql"
        mkdir -p "$(dirname "$backup_file")"

        pg_dump "$DATABASE_URL" > "$backup_file" || error_exit "Database backup failed"
        log "Database backup created: $backup_file"

        # Docker image backup
        docker save "studyteddy-backend:current" "studyteddy-frontend:current" | gzip > "$PROJECT_ROOT/backups/images-backup-$(date +%Y%m%d-%H%M%S).tar.gz" || true
    fi
}

# Post-deployment verification
post_deployment_verification() {
    log "Running post-deployment verification..."

    # Wait for services to stabilize
    sleep 60

    # Comprehensive health checks
    health_check "Backend Health" "http://localhost:3001/health"
    health_check "Frontend" "http://localhost:3000"

    # API endpoints test
    log "Testing critical API endpoints..."
    api_endpoints=(
        "/api/v1/health"
        "/api/v1/status"
    )

    for endpoint in "${api_endpoints[@]}"; do
        if ! curl -f -s "http://localhost:3001$endpoint" > /dev/null; then
            error_exit "API endpoint test failed: $endpoint"
        fi
    done

    # Database connectivity test
    log "Testing database connectivity from application..."
    if ! docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" exec -T backend \
        sh -c 'timeout 10 bun -e "const { Pool } = require(\"pg\"); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query(\"SELECT 1\").then(() => process.exit(0)).catch(() => process.exit(1));"'; then
        error_exit "Database connectivity test failed"
    fi

    # Redis connectivity test
    log "Testing Redis connectivity from application..."
    if ! docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" exec -T backend \
        sh -c 'timeout 10 bun -e "const redis = require(\"redis\"); const client = redis.createClient({ url: process.env.REDIS_URL }); client.connect().then(() => client.ping()).then(() => { client.disconnect(); process.exit(0); }).catch(() => process.exit(1));"'; then
        error_exit "Redis connectivity test failed"
    fi

    log "Post-deployment verification passed"
}

# Rollback function
rollback() {
    local rollback_version=${1:-previous}
    log "Rolling back to version: $rollback_version"

    # Stop current deployment
    docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" down

    # Restore from backup if needed
    if [[ "$rollback_version" == "backup" ]]; then
        log "Restoring from backup..."

        # Find latest backup
        latest_db_backup=$(ls -t "$PROJECT_ROOT/backups/db-backup-"*.sql 2>/dev/null | head -1)
        latest_image_backup=$(ls -t "$PROJECT_ROOT/backups/images-backup-"*.tar.gz 2>/dev/null | head -1)

        if [[ -n "$latest_db_backup" ]]; then
            log "Restoring database from $latest_db_backup"
            psql "$DATABASE_URL" < "$latest_db_backup" || error_exit "Database restore failed"
        fi

        if [[ -n "$latest_image_backup" ]]; then
            log "Restoring Docker images from $latest_image_backup"
            gunzip -c "$latest_image_backup" | docker load || error_exit "Image restore failed"
        fi
    fi

    # Deploy previous version
    sed -i.bak "s|studyteddy-backend:.*|studyteddy-backend:$rollback_version|g" "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml"
    sed -i.bak "s|studyteddy-frontend:.*|studyteddy-frontend:$rollback_version|g" "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml"

    docker-compose -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" up -d

    # Health check after rollback
    sleep 30
    health_check "Backend (after rollback)" "http://localhost:3001/health"
    health_check "Frontend (after rollback)" "http://localhost:3000"

    log "Rollback completed successfully"
}

# Main deployment function
main() {
    log "Starting deployment process..."

    # Check if this is a rollback
    if [[ "$1" == "rollback" ]]; then
        rollback "$2"
        return 0
    fi

    # Pre-deployment
    pre_deployment_checks
    create_backup
    build_images
    run_migrations

    # Execute deployment strategy
    case $STRATEGY in
        rolling)
            deploy_rolling
            ;;
        blue-green)
            deploy_blue_green
            ;;
        recreate)
            deploy_recreate
            ;;
    esac

    # Post-deployment
    post_deployment_verification

    # Tag current images
    docker tag "studyteddy-backend:$VERSION" "studyteddy-backend:current"
    docker tag "studyteddy-frontend:$VERSION" "studyteddy-frontend:current"

    log "Deployment completed successfully!"
    log "Deployment log saved to: $DEPLOY_LOG"

    # Send notification (if webhook is configured)
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 StudyTeddy $ENVIRONMENT deployment successful! Version: $VERSION\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi
}

# Handle help
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    cat << EOF
Docker Deployment Script for StudyTeddy

Usage:
    $0 [environment] [strategy] [version]
    $0 rollback [version]

Arguments:
    environment    Target environment (production, staging, development, local)
    strategy       Deployment strategy (rolling, blue-green, recreate)
    version        Docker image version tag (default: latest)

Examples:
    $0 staging rolling v1.2.3
    $0 production blue-green latest
    $0 rollback previous
    $0 rollback backup

Options:
    --help, -h     Show this help message

Environment Variables:
    SLACK_WEBHOOK_URL    Slack webhook for notifications (optional)

EOF
    exit 0
fi

# Execute main function
main "$@"