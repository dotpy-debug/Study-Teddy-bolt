#!/bin/bash

# Vercel Deployment Script for StudyTeddy
# Supports production, staging, and preview deployments with advanced features
# Usage: ./deploy-vercel.sh [environment] [strategy]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_LOG="$PROJECT_ROOT/logs/vercel-deployment-$(date +%Y%m%d-%H%M%S).log"

# Ensure log directory exists
mkdir -p "$(dirname "$DEPLOY_LOG")"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$DEPLOY_LOG"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    send_notification "❌" "Vercel Deployment Failed" "$1"
    exit 1
}

# Send notification function
send_notification() {
    local emoji=$1
    local title=$2
    local message=$3

    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"text\": \"$emoji $title\",
                \"blocks\": [
                    {
                        \"type\": \"section\",
                        \"text\": {
                            \"type\": \"mrkdwn\",
                            \"text\": \"*Environment:* $ENVIRONMENT\\n*Project:* StudyTeddy\\n*Message:* $message\"
                        }
                    }
                ]
            }" \
            "$SLACK_WEBHOOK_URL" || true
    fi

    # Discord webhook support
    if [[ -n "$DISCORD_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-Type: application/json' \
            --data "{
                \"embeds\": [{
                    \"title\": \"$title\",
                    \"description\": \"$message\",
                    \"color\": $([ "$emoji" = "✅" ] && echo "65280" || echo "16711680"),
                    \"fields\": [
                        {\"name\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"inline\": true},
                        {\"name\": \"Project\", \"value\": \"StudyTeddy\", \"inline\": true}
                    ],
                    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
                }]
            }" \
            "$DISCORD_WEBHOOK_URL" || true
    fi
}

# Parse arguments
ENVIRONMENT=${1:-preview}
STRATEGY=${2:-standard}

log "Starting Vercel deployment for StudyTeddy"
log "Environment: $ENVIRONMENT"
log "Strategy: $STRATEGY"

# Validate environment
case $ENVIRONMENT in
    production|staging|preview|development)
        log "Valid environment: $ENVIRONMENT"
        ;;
    *)
        error_exit "Invalid environment: $ENVIRONMENT. Use: production, staging, preview, or development"
        ;;
esac

# Validate strategy
case $STRATEGY in
    standard|canary|aliased|domain-migration)
        log "Valid strategy: $STRATEGY"
        ;;
    *)
        error_exit "Invalid strategy: $STRATEGY. Use: standard, canary, aliased, or domain-migration"
        ;;
esac

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check Vercel CLI
    if ! command -v vercel &> /dev/null; then
        log "Installing Vercel CLI..."
        npm install -g vercel@latest || error_exit "Failed to install Vercel CLI"
    fi

    # Check Bun
    if ! command -v bun &> /dev/null; then
        error_exit "Bun is not installed"
    fi

    # Check if logged into Vercel
    if ! vercel whoami &> /dev/null; then
        if [[ -n "$VERCEL_TOKEN" ]]; then
            log "Authenticating with Vercel using token..."
            echo "$VERCEL_TOKEN" | vercel login --stdin || error_exit "Failed to authenticate with Vercel"
        else
            error_exit "Not logged into Vercel and no VERCEL_TOKEN provided"
        fi
    fi

    # Verify project structure
    if [[ ! -f "$PROJECT_ROOT/vercel.json" ]]; then
        error_exit "vercel.json not found in project root"
    fi

    # Check required environment files
    case $ENVIRONMENT in
        production)
            ENV_FILE="$PROJECT_ROOT/.env.production"
            ;;
        staging)
            ENV_FILE="$PROJECT_ROOT/.env.staging"
            ;;
        *)
            ENV_FILE="$PROJECT_ROOT/.env.local"
            ;;
    esac

    if [[ ! -f "$ENV_FILE" ]]; then
        error_exit "Environment file not found: $ENV_FILE"
    fi

    log "Prerequisites check passed"
}

# Load and validate environment variables
load_environment() {
    log "Loading environment variables..."

    # Load environment variables
    if [[ -f "$ENV_FILE" ]]; then
        export $(grep -v '^#' "$ENV_FILE" | xargs)
    fi

    # Validate required variables for frontend
    required_vars=(
        "NEXT_PUBLIC_API_URL"
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error_exit "Required environment variable $var is not set"
        fi
    done

    # Set Vercel-specific environment variables
    case $ENVIRONMENT in
        production)
            export VERCEL_ENV="production"
            export VERCEL_PROJECT_ID="${VERCEL_PRODUCTION_PROJECT_ID:-studyteddy}"
            ;;
        staging)
            export VERCEL_ENV="preview"
            export VERCEL_PROJECT_ID="${VERCEL_STAGING_PROJECT_ID:-studyteddy-staging}"
            ;;
        *)
            export VERCEL_ENV="development"
            export VERCEL_PROJECT_ID="${VERCEL_DEV_PROJECT_ID:-studyteddy-dev}"
            ;;
    esac

    log "Environment variables loaded successfully"
}

# Setup Vercel project configuration
setup_vercel_project() {
    log "Setting up Vercel project configuration..."

    # Create or update vercel project settings
    cat > "$PROJECT_ROOT/.vercel/project.json" << EOF
{
  "projectId": "$VERCEL_PROJECT_ID",
  "orgId": "${VERCEL_ORG_ID:-personal}",
  "settings": {
    "buildCommand": "cd apps/frontend && bun run build",
    "outputDirectory": "apps/frontend/.next",
    "installCommand": "bun install",
    "framework": "nextjs",
    "nodeVersion": "20.x"
  }
}
EOF

    # Ensure .vercel directory exists
    mkdir -p "$PROJECT_ROOT/.vercel"

    # Link project if not already linked
    if [[ ! -f "$PROJECT_ROOT/.vercel/project.json" ]] || ! vercel whoami &> /dev/null; then
        log "Linking Vercel project..."
        cd "$PROJECT_ROOT"
        vercel link --yes || error_exit "Failed to link Vercel project"
    fi
}

# Upload environment variables to Vercel
upload_environment_variables() {
    log "Uploading environment variables to Vercel..."

    # Environment variables to upload
    env_vars=(
        "NEXT_PUBLIC_API_URL"
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
        "NEXT_PUBLIC_APP_NAME"
        "NEXT_PUBLIC_APP_VERSION"
        "NEXT_PUBLIC_SENTRY_DSN"
        "NEXT_PUBLIC_GOOGLE_ANALYTICS_ID"
        "NEXT_PUBLIC_POSTHOG_KEY"
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    )

    for var in "${env_vars[@]}"; do
        if [[ -n "${!var}" ]]; then
            log "Uploading $var..."
            vercel env add "$var" "$ENVIRONMENT" <<< "${!var}" || log "WARNING: Failed to upload $var"
        fi
    done

    # Upload secrets separately
    secret_vars=(
        "NEXTAUTH_SECRET"
        "STRIPE_SECRET_KEY"
        "OPENAI_API_KEY"
        "SENTRY_AUTH_TOKEN"
    )

    for var in "${secret_vars[@]}"; do
        if [[ -n "${!var}" ]]; then
            log "Uploading secret $var..."
            vercel env add "$var" "$ENVIRONMENT" --sensitive <<< "${!var}" || log "WARNING: Failed to upload secret $var"
        fi
    done
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."

    # Lint check
    cd "$PROJECT_ROOT/apps/frontend"
    log "Running lint check..."
    bun run lint || error_exit "Lint check failed"

    # Type checking
    log "Running type check..."
    bun run typecheck || error_exit "Type check failed"

    # Build test
    log "Running build test..."
    bun run build || error_exit "Build test failed"

    # Security scan
    log "Running security scan..."
    bunx audit-ci --config "$PROJECT_ROOT/.audit-ci.json" || log "WARNING: Security vulnerabilities found"

    # Bundle size analysis
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "Analyzing bundle size..."
        bun run build:analyze || log "WARNING: Bundle analysis failed"
    fi

    cd "$PROJECT_ROOT"
    log "Pre-deployment checks completed"
}

# Standard deployment
deploy_standard() {
    log "Executing standard deployment..."

    cd "$PROJECT_ROOT"

    # Deploy based on environment
    case $ENVIRONMENT in
        production)
            log "Deploying to production..."
            vercel --prod --yes || error_exit "Production deployment failed"
            ;;
        staging)
            log "Deploying to staging..."
            vercel --target preview --yes || error_exit "Staging deployment failed"
            ;;
        *)
            log "Deploying preview..."
            vercel --yes || error_exit "Preview deployment failed"
            ;;
    esac
}

# Canary deployment (A/B testing)
deploy_canary() {
    log "Executing canary deployment..."

    cd "$PROJECT_ROOT"

    # Deploy canary version
    log "Deploying canary version..."
    CANARY_URL=$(vercel --yes | grep -o 'https://[^[:space:]]*')

    if [[ -z "$CANARY_URL" ]]; then
        error_exit "Failed to get canary deployment URL"
    fi

    log "Canary deployed at: $CANARY_URL"

    # Configure traffic splitting (requires Vercel Pro)
    if [[ "$ENVIRONMENT" == "production" && -n "$VERCEL_TEAM_ID" ]]; then
        log "Configuring traffic split..."

        # Create alias with traffic splitting
        vercel alias set "$CANARY_URL" "canary.studyteddy.com" || log "WARNING: Failed to set canary alias"

        # Set up edge config for A/B testing
        cat > /tmp/edge-config.json << EOF
{
  "canary_percentage": 10,
  "canary_url": "$CANARY_URL",
  "production_url": "https://studyteddy.com"
}
EOF

        # Upload edge config (if available)
        vercel edge-config set canary-config /tmp/edge-config.json || log "WARNING: Failed to set edge config"
    fi

    log "Canary deployment completed"
}

# Aliased deployment
deploy_aliased() {
    log "Executing aliased deployment..."

    cd "$PROJECT_ROOT"

    # Deploy and get URL
    DEPLOYMENT_URL=$(vercel --yes | grep -o 'https://[^[:space:]]*')

    if [[ -z "$DEPLOYMENT_URL" ]]; then
        error_exit "Failed to get deployment URL"
    fi

    log "Deployment URL: $DEPLOYMENT_URL"

    # Set custom alias based on environment
    case $ENVIRONMENT in
        production)
            ALIAS="studyteddy.com"
            ;;
        staging)
            ALIAS="staging.studyteddy.com"
            ;;
        *)
            ALIAS="preview-$(date +%s).studyteddy.com"
            ;;
    esac

    log "Setting alias: $ALIAS"
    vercel alias set "$DEPLOYMENT_URL" "$ALIAS" || error_exit "Failed to set alias"

    log "Aliased deployment completed. Available at: https://$ALIAS"
}

# Domain migration deployment
deploy_domain_migration() {
    log "Executing domain migration deployment..."

    cd "$PROJECT_ROOT"

    # Deploy to new domain
    NEW_DOMAIN="${NEW_DOMAIN:-new.studyteddy.com}"

    # Deploy
    DEPLOYMENT_URL=$(vercel --yes | grep -o 'https://[^[:space:]]*')

    if [[ -z "$DEPLOYMENT_URL" ]]; then
        error_exit "Failed to get deployment URL"
    fi

    # Set new domain alias
    vercel alias set "$DEPLOYMENT_URL" "$NEW_DOMAIN" || error_exit "Failed to set new domain alias"

    # Create redirect from old domain (if configured)
    if [[ -n "$OLD_DOMAIN" ]]; then
        log "Setting up redirect from $OLD_DOMAIN to $NEW_DOMAIN"

        # Create redirect configuration
        cat > /tmp/redirect-vercel.json << EOF
{
  "redirects": [
    {
      "source": "/(.*)",
      "destination": "https://$NEW_DOMAIN/\$1",
      "permanent": true
    }
  ]
}
EOF

        # Deploy redirect (requires separate project)
        # This would typically be handled through DNS or a separate redirect service
    fi

    log "Domain migration deployment completed"
}

# Health checks
health_check() {
    local url=$1
    local max_attempts=30
    local attempt=1

    log "Running health check for $url"

    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            log "Health check passed (attempt $attempt)"
            return 0
        fi

        log "Health check failed (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done

    error_exit "Health check failed after $max_attempts attempts"
}

# Performance testing
performance_test() {
    local url=$1

    log "Running performance tests for $url"

    # Lighthouse CI (if configured)
    if command -v lhci &> /dev/null; then
        log "Running Lighthouse CI..."
        lhci autorun --upload.target=filesystem --upload.outputDir="$PROJECT_ROOT/lighthouse-results" || log "WARNING: Lighthouse CI failed"
    fi

    # Simple performance check with curl
    log "Checking response times..."

    # Homepage response time
    response_time=$(curl -o /dev/null -s -w '%{time_total}' "$url")
    log "Homepage response time: ${response_time}s"

    # Validate response time (under 3 seconds)
    if (( $(echo "$response_time > 3.0" | bc -l) )); then
        log "WARNING: Response time is slow: ${response_time}s"
    fi

    # Check Core Web Vitals using PageSpeed Insights API (if key available)
    if [[ -n "$PAGESPEED_API_KEY" ]]; then
        log "Checking Core Web Vitals..."

        pagespeed_url="https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=$url&key=$PAGESPEED_API_KEY&category=performance"
        curl -s "$pagespeed_url" > /tmp/pagespeed-results.json || log "WARNING: PageSpeed test failed"
    fi
}

# Post-deployment verification
post_deployment_verification() {
    log "Running post-deployment verification..."

    # Get deployment URL
    DEPLOYMENT_URL=$(vercel ls | grep "$VERCEL_PROJECT_ID" | head -1 | awk '{print $2}' | sed 's/^/https:\/\//')

    if [[ -z "$DEPLOYMENT_URL" ]]; then
        error_exit "Could not determine deployment URL"
    fi

    log "Deployment URL: $DEPLOYMENT_URL"

    # Health checks
    health_check "$DEPLOYMENT_URL"

    # Performance testing
    if [[ "$ENVIRONMENT" == "production" ]]; then
        performance_test "$DEPLOYMENT_URL"
    fi

    # SEO and accessibility checks
    if command -v lighthouse &> /dev/null && [[ "$ENVIRONMENT" == "production" ]]; then
        log "Running SEO and accessibility checks..."
        lighthouse "$DEPLOYMENT_URL" \
            --only-categories=seo,accessibility \
            --output=json \
            --output-path="$PROJECT_ROOT/lighthouse-seo-results.json" || log "WARNING: SEO/Accessibility check failed"
    fi

    # Security headers check
    log "Checking security headers..."
    security_headers_check "$DEPLOYMENT_URL"

    log "Post-deployment verification completed"
}

# Security headers check
security_headers_check() {
    local url=$1

    log "Checking security headers for $url"

    # Required security headers
    security_headers=(
        "X-Frame-Options"
        "X-Content-Type-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
        "Content-Security-Policy"
        "Referrer-Policy"
    )

    for header in "${security_headers[@]}"; do
        if curl -I -s "$url" | grep -qi "$header"; then
            log "✓ $header header found"
        else
            log "⚠ $header header missing"
        fi
    done
}

# Rollback function
rollback() {
    local rollback_deployment=${1:-previous}
    log "Rolling back to deployment: $rollback_deployment"

    cd "$PROJECT_ROOT"

    # Get list of recent deployments
    vercel ls --limit=10

    if [[ "$rollback_deployment" == "previous" ]]; then
        # Get previous deployment URL
        PREVIOUS_URL=$(vercel ls --limit=2 | tail -1 | awk '{print $2}' | sed 's/^/https:\/\//')

        if [[ -z "$PREVIOUS_URL" ]]; then
            error_exit "Could not find previous deployment"
        fi

        log "Rolling back to: $PREVIOUS_URL"
    else
        PREVIOUS_URL="$rollback_deployment"
    fi

    # Promote previous deployment
    case $ENVIRONMENT in
        production)
            vercel alias set "$PREVIOUS_URL" "studyteddy.com" || error_exit "Rollback failed"
            ;;
        staging)
            vercel alias set "$PREVIOUS_URL" "staging.studyteddy.com" || error_exit "Rollback failed"
            ;;
    esac

    # Health check after rollback
    health_check "$PREVIOUS_URL"

    log "Rollback completed successfully"
}

# Cleanup old deployments
cleanup_deployments() {
    log "Cleaning up old deployments..."

    cd "$PROJECT_ROOT"

    # Keep last 10 deployments, remove older ones
    vercel ls --limit=50 | tail -n +11 | while read -r line; do
        deployment_url=$(echo "$line" | awk '{print $2}')
        if [[ -n "$deployment_url" ]]; then
            log "Removing old deployment: $deployment_url"
            vercel rm "$deployment_url" --yes || log "WARNING: Failed to remove $deployment_url"
        fi
    done
}

# Generate deployment report
generate_deployment_report() {
    log "Generating deployment report..."

    # Get deployment information
    DEPLOYMENT_URL=$(vercel ls | grep "$VERCEL_PROJECT_ID" | head -1 | awk '{print $2}' | sed 's/^/https:\/\//')

    cat > "$PROJECT_ROOT/deployment-report-$(date +%Y%m%d-%H%M%S).json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "strategy": "$STRATEGY",
  "deployment_url": "$DEPLOYMENT_URL",
  "project_id": "$VERCEL_PROJECT_ID",
  "commit_sha": "$(git rev-parse HEAD)",
  "branch": "$(git branch --show-current)",
  "deployer": "$(git config user.email)",
  "build_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "success"
}
EOF

    log "Deployment report generated"
}

# Main deployment function
main() {
    log "Starting Vercel deployment process..."

    # Check if this is a rollback
    if [[ "$1" == "rollback" ]]; then
        check_prerequisites
        rollback "$2"
        return 0
    fi

    # Pre-deployment
    check_prerequisites
    load_environment
    setup_vercel_project
    upload_environment_variables
    pre_deployment_checks

    # Execute deployment strategy
    case $STRATEGY in
        standard)
            deploy_standard
            ;;
        canary)
            deploy_canary
            ;;
        aliased)
            deploy_aliased
            ;;
        domain-migration)
            deploy_domain_migration
            ;;
    esac

    # Post-deployment
    post_deployment_verification
    generate_deployment_report

    # Cleanup (only for production)
    if [[ "$ENVIRONMENT" == "production" ]]; then
        cleanup_deployments
    fi

    # Send success notification
    DEPLOYMENT_URL=$(vercel ls | grep "$VERCEL_PROJECT_ID" | head -1 | awk '{print $2}' | sed 's/^/https:\/\//')
    send_notification "✅" "Vercel Deployment Successful" "Deployment completed successfully at $DEPLOYMENT_URL"

    log "Vercel deployment completed successfully!"
    log "Deployment URL: $DEPLOYMENT_URL"
    log "Deployment log saved to: $DEPLOY_LOG"
}

# Handle help
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    cat << EOF
Vercel Deployment Script for StudyTeddy

Usage:
    $0 [environment] [strategy]
    $0 rollback [deployment_url]

Arguments:
    environment    Target environment (production, staging, preview, development)
    strategy       Deployment strategy (standard, canary, aliased, domain-migration)

Examples:
    $0 production standard
    $0 staging canary
    $0 preview aliased
    $0 rollback previous
    $0 rollback https://studyteddy-abc123.vercel.app

Environment Variables:
    VERCEL_TOKEN                  Vercel authentication token
    VERCEL_ORG_ID                Vercel organization ID
    VERCEL_PRODUCTION_PROJECT_ID  Production project ID
    VERCEL_STAGING_PROJECT_ID     Staging project ID
    SLACK_WEBHOOK_URL            Slack webhook for notifications
    DISCORD_WEBHOOK_URL          Discord webhook for notifications
    PAGESPEED_API_KEY            PageSpeed Insights API key
    NEW_DOMAIN                   New domain for domain migration
    OLD_DOMAIN                   Old domain for domain migration

EOF
    exit 0
fi

# Execute main function
main "$@"