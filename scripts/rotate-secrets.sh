#!/bin/bash
set -euo pipefail

# ============================================
# Study Teddy Secret Rotation Script
# ============================================
# Automated secret rotation for production environments

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/studyteddy/secret-rotation.log"
BACKUP_DIR="/var/backups/studyteddy/secrets"
NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# Logging Functions
# ============================================

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "$@"
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_warn() {
    log "WARN" "$@"
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    log "ERROR" "$@"
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_success() {
    log "SUCCESS" "$@"
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

# ============================================
# Utility Functions
# ============================================

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if running as appropriate user
    if [[ $EUID -eq 0 ]] && [[ "${ALLOW_ROOT:-false}" != "true" ]]; then
        log_error "This script should not be run as root. Set ALLOW_ROOT=true to override."
        exit 1
    fi

    # Check required tools
    local required_tools=("kubectl" "curl" "jq" "bun")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool '$tool' is not installed"
            exit 1
        fi
    done

    # Check environment variables
    if [[ -z "${ENVIRONMENT:-}" ]]; then
        log_error "ENVIRONMENT variable must be set (staging, production)"
        exit 1
    fi

    # Check Kubernetes access
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot access Kubernetes cluster"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

backup_current_secrets() {
    local environment="$1"
    local backup_timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_path="$BACKUP_DIR/${environment}_${backup_timestamp}"

    log_info "Backing up current secrets to $backup_path"

    mkdir -p "$backup_path"

    # Backup Kubernetes secrets
    kubectl get secrets -n "studyteddy-${environment}" \
        -l "app=studyteddy" \
        -o yaml > "$backup_path/kubernetes-secrets.yaml"

    # Backup from secret management system if available
    if [[ -n "${SECRETS_BACKEND:-}" ]]; then
        case "$SECRETS_BACKEND" in
            "aws")
                backup_aws_secrets "$environment" "$backup_path"
                ;;
            "vault")
                backup_vault_secrets "$environment" "$backup_path"
                ;;
        esac
    fi

    log_success "Secrets backed up to $backup_path"
    echo "$backup_path"
}

backup_aws_secrets() {
    local environment="$1"
    local backup_path="$2"

    log_info "Backing up AWS Secrets Manager secrets"

    aws secretsmanager list-secrets \
        --filters Key=tag-key,Values=environment Key=tag-value,Values="$environment" \
        --query 'SecretList[].Name' \
        --output text | while read -r secret_name; do

        if [[ -n "$secret_name" ]]; then
            aws secretsmanager get-secret-value \
                --secret-id "$secret_name" \
                --query 'SecretString' \
                --output text > "$backup_path/aws_$(basename "$secret_name").json"
        fi
    done
}

backup_vault_secrets() {
    local environment="$1"
    local backup_path="$2"

    log_info "Backing up HashiCorp Vault secrets"

    # This would be customized based on your Vault structure
    vault kv list -format=json "secret/studyteddy/$environment" | jq -r '.[]' | while read -r secret_name; do
        vault kv get -format=json "secret/studyteddy/$environment/$secret_name" \
            > "$backup_path/vault_${secret_name}.json"
    done
}

generate_new_secret() {
    local secret_type="$1"
    local length="$2"

    case "$secret_type" in
        "jwt")
            openssl rand -hex "$length"
            ;;
        "password")
            # Generate password with mixed characters
            LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*()_+=' < /dev/urandom | head -c "$length"
            ;;
        "api_key")
            echo "sk_$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c $((length-3)))"
            ;;
        "random")
            LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c "$length"
            ;;
        *)
            log_error "Unknown secret type: $secret_type"
            exit 1
            ;;
    esac
}

rotate_kubernetes_secret() {
    local environment="$1"
    local secret_name="$2"
    local secret_key="$3"
    local new_value="$4"

    log_info "Rotating Kubernetes secret: $secret_name/$secret_key"

    # Create temporary patch file
    local patch_file="/tmp/secret-patch-$(date +%s).json"
    cat > "$patch_file" << EOF
{
    "data": {
        "$secret_key": "$(echo -n "$new_value" | base64 -w 0)"
    }
}
EOF

    # Apply the patch
    kubectl patch secret "$secret_name" \
        -n "studyteddy-${environment}" \
        --type merge \
        --patch-file "$patch_file"

    # Clean up
    rm -f "$patch_file"

    log_success "Kubernetes secret rotated: $secret_name/$secret_key"
}

rotate_aws_secret() {
    local secret_name="$1"
    local new_value="$2"

    log_info "Rotating AWS Secrets Manager secret: $secret_name"

    aws secretsmanager update-secret \
        --secret-id "$secret_name" \
        --secret-string "$new_value"

    log_success "AWS secret rotated: $secret_name"
}

rotate_vault_secret() {
    local secret_path="$1"
    local secret_key="$2"
    local new_value="$3"

    log_info "Rotating Vault secret: $secret_path/$secret_key"

    # Get current secret
    local current_secret
    current_secret=$(vault kv get -format=json "$secret_path" | jq '.data.data')

    # Update with new value
    local updated_secret
    updated_secret=$(echo "$current_secret" | jq --arg key "$secret_key" --arg value "$new_value" '.[$key] = $value')

    # Write back to Vault
    echo "$updated_secret" | vault kv put "$secret_path" -

    log_success "Vault secret rotated: $secret_path/$secret_key"
}

trigger_application_restart() {
    local environment="$1"
    local deployment_name="$2"

    log_info "Triggering restart for deployment: $deployment_name"

    kubectl rollout restart "deployment/$deployment_name" -n "studyteddy-${environment}"
    kubectl rollout status "deployment/$deployment_name" -n "studyteddy-${environment}" --timeout=300s

    log_success "Deployment restarted: $deployment_name"
}

verify_application_health() {
    local environment="$1"
    local max_attempts=10
    local attempt=1

    log_info "Verifying application health after secret rotation"

    while [[ $attempt -le $max_attempts ]]; do
        local health_url
        case "$environment" in
            "staging")
                health_url="https://api-staging.studyteddy.com/health"
                ;;
            "production")
                health_url="https://api.studyteddy.com/health"
                ;;
            *)
                log_warn "Unknown environment for health check: $environment"
                return 0
                ;;
        esac

        if curl -f -s "$health_url" > /dev/null; then
            log_success "Application health check passed"
            return 0
        fi

        log_warn "Health check failed, attempt $attempt/$max_attempts"
        sleep 30
        ((attempt++))
    done

    log_error "Application health check failed after $max_attempts attempts"
    return 1
}

send_notification() {
    local status="$1"
    local message="$2"

    if [[ -n "$NOTIFICATION_WEBHOOK" ]]; then
        local payload
        payload=$(jq -n \
            --arg status "$status" \
            --arg message "$message" \
            --arg environment "${ENVIRONMENT}" \
            --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '{
                "status": $status,
                "message": $message,
                "environment": $environment,
                "timestamp": $timestamp,
                "service": "studyteddy-secret-rotation"
            }')

        curl -X POST "$NOTIFICATION_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "$payload" \
            --max-time 10 || log_warn "Failed to send notification"
    fi
}

# ============================================
# Secret Rotation Configurations
# ============================================

declare -A SECRET_CONFIGS
SECRET_CONFIGS[JWT_SECRET]="jwt:64:studyteddy-production-secrets:JWT_SECRET"
SECRET_CONFIGS[NEXTAUTH_SECRET]="random:64:studyteddy-production-secrets:NEXTAUTH_SECRET"
SECRET_CONFIGS[BETTER_AUTH_SECRET]="random:64:studyteddy-production-secrets:BETTER_AUTH_SECRET"
SECRET_CONFIGS[DATABASE_PASSWORD]="password:32:studyteddy-production-secrets:DATABASE_PASSWORD"
SECRET_CONFIGS[REDIS_PASSWORD]="password:32:studyteddy-production-secrets:REDIS_PASSWORD"
SECRET_CONFIGS[WEBHOOK_SECRET]="random:48:studyteddy-production-secrets:WEBHOOK_SECRET"

# ============================================
# Main Rotation Functions
# ============================================

rotate_single_secret() {
    local secret_name="$1"
    local environment="$2"

    if [[ -z "${SECRET_CONFIGS[$secret_name]:-}" ]]; then
        log_error "Unknown secret: $secret_name"
        return 1
    fi

    IFS=':' read -r secret_type length k8s_secret k8s_key <<< "${SECRET_CONFIGS[$secret_name]}"

    log_info "Starting rotation for secret: $secret_name"

    # Generate new secret value
    local new_value
    new_value=$(generate_new_secret "$secret_type" "$length")

    # Rotate in Kubernetes
    rotate_kubernetes_secret "$environment" "$k8s_secret" "$k8s_key" "$new_value"

    # Rotate in external secret management system if configured
    case "${SECRETS_BACKEND:-kubernetes}" in
        "aws")
            rotate_aws_secret "studyteddy/${environment}/${secret_name}" "$new_value"
            ;;
        "vault")
            rotate_vault_secret "secret/studyteddy/${environment}" "$secret_name" "$new_value"
            ;;
    esac

    log_success "Secret rotation completed: $secret_name"
}

rotate_critical_secrets() {
    local environment="$1"
    local critical_secrets=("JWT_SECRET" "NEXTAUTH_SECRET" "BETTER_AUTH_SECRET")

    log_info "Rotating critical secrets for environment: $environment"

    for secret in "${critical_secrets[@]}"; do
        rotate_single_secret "$secret" "$environment"
    done

    # Restart applications that use these secrets
    trigger_application_restart "$environment" "studyteddy-backend"
    trigger_application_restart "$environment" "studyteddy-frontend"

    # Verify health
    verify_application_health "$environment"
}

rotate_database_secrets() {
    local environment="$1"

    log_info "Rotating database secrets for environment: $environment"

    # This requires coordination with database to ensure new password is accepted
    log_warn "Database secret rotation requires manual coordination"
    log_warn "Please use the database-specific rotation procedures"

    # For automated database rotation, you would:
    # 1. Create new user with new password
    # 2. Update application with new credentials
    # 3. Restart applications
    # 4. Remove old user after grace period
}

rotate_all_secrets() {
    local environment="$1"

    log_info "Starting complete secret rotation for environment: $environment"

    local backup_path
    backup_path=$(backup_current_secrets "$environment")

    # Rotate non-critical secrets first
    for secret in WEBHOOK_SECRET REDIS_PASSWORD; do
        rotate_single_secret "$secret" "$environment" || {
            log_error "Failed to rotate $secret, stopping rotation"
            return 1
        }
    done

    # Rotate critical secrets (requires restart)
    rotate_critical_secrets "$environment"

    log_success "Complete secret rotation finished for environment: $environment"
    log_info "Backup stored at: $backup_path"
}

# ============================================
# Emergency Procedures
# ============================================

emergency_rotation() {
    local secret_name="$1"
    local environment="$2"

    log_warn "EMERGENCY ROTATION: $secret_name for $environment"

    # Skip backup in emergency
    rotate_single_secret "$secret_name" "$environment"

    # Immediate restart
    trigger_application_restart "$environment" "studyteddy-backend"
    trigger_application_restart "$environment" "studyteddy-frontend"

    # Send emergency notification
    send_notification "emergency" "Emergency rotation completed for $secret_name in $environment"
}

rollback_secrets() {
    local environment="$1"
    local backup_path="$2"

    log_warn "Rolling back secrets from backup: $backup_path"

    if [[ ! -d "$backup_path" ]]; then
        log_error "Backup path not found: $backup_path"
        return 1
    fi

    # Restore Kubernetes secrets
    kubectl apply -f "$backup_path/kubernetes-secrets.yaml"

    # Restart applications
    trigger_application_restart "$environment" "studyteddy-backend"
    trigger_application_restart "$environment" "studyteddy-frontend"

    log_success "Secrets rolled back from backup"
}

# ============================================
# CLI Interface
# ============================================

usage() {
    cat << EOF
Study Teddy Secret Rotation Script

Usage: $0 <command> [options]

Commands:
    rotate-all <environment>
        Rotate all secrets for the specified environment

    rotate-critical <environment>
        Rotate only critical secrets (JWT, auth secrets)

    rotate-single <secret_name> <environment>
        Rotate a specific secret

    emergency <secret_name> <environment>
        Emergency rotation (skip backup, immediate restart)

    rollback <environment> <backup_path>
        Rollback secrets from backup

    check-health <environment>
        Check application health

Environment Variables:
    ENVIRONMENT         - Target environment (staging, production)
    SECRETS_BACKEND     - Secret backend (kubernetes, aws, vault)
    NOTIFICATION_WEBHOOK - Webhook URL for notifications
    ALLOW_ROOT          - Allow running as root (default: false)

Examples:
    $0 rotate-all production
    $0 rotate-critical staging
    $0 rotate-single JWT_SECRET production
    $0 emergency JWT_SECRET production
    $0 check-health staging

EOF
}

main() {
    local command="${1:-}"

    case "$command" in
        "rotate-all")
            check_prerequisites
            rotate_all_secrets "${2:-$ENVIRONMENT}"
            send_notification "success" "Complete secret rotation finished"
            ;;
        "rotate-critical")
            check_prerequisites
            rotate_critical_secrets "${2:-$ENVIRONMENT}"
            send_notification "success" "Critical secret rotation finished"
            ;;
        "rotate-single")
            check_prerequisites
            rotate_single_secret "${2:-}" "${3:-$ENVIRONMENT}"
            send_notification "success" "Single secret rotation finished: ${2:-}"
            ;;
        "emergency")
            check_prerequisites
            emergency_rotation "${2:-}" "${3:-$ENVIRONMENT}"
            ;;
        "rollback")
            check_prerequisites
            rollback_secrets "${2:-$ENVIRONMENT}" "${3:-}"
            send_notification "warning" "Secrets rolled back from backup"
            ;;
        "check-health")
            verify_application_health "${2:-$ENVIRONMENT}"
            ;;
        "help"|"-h"|"--help")
            usage
            ;;
        *)
            log_error "Unknown command: $command"
            usage
            exit 1
            ;;
    esac
}

# Initialize logging
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$BACKUP_DIR"

# Run main function
main "$@"