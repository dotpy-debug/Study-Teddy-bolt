#!/bin/bash

# Kubernetes Deployment Script for StudyTeddy
# Advanced deployment with multiple strategies and zero-downtime deployments
# Usage: ./deploy-kubernetes.sh [environment] [strategy] [version]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_LOG="$PROJECT_ROOT/logs/k8s-deployment-$(date +%Y%m%d-%H%M%S).log"

# Ensure log directory exists
mkdir -p "$(dirname "$DEPLOY_LOG")"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$DEPLOY_LOG"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    send_alert "deployment_failed" "$1"
    exit 1
}

# Send alert function
send_alert() {
    local event_type=$1
    local message=$2

    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local emoji="🚨"
        [[ "$event_type" == "deployment_success" ]] && emoji="🚀"

        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"text\": \"$emoji StudyTeddy K8s Deployment Alert\",
                \"blocks\": [
                    {
                        \"type\": \"section\",
                        \"text\": {
                            \"type\": \"mrkdwn\",
                            \"text\": \"*Environment:* $ENVIRONMENT\\n*Event:* $event_type\\n*Message:* $message\"
                        }
                    }
                ]
            }" \
            "$SLACK_WEBHOOK_URL" || true
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary resources..."
    rm -f /tmp/studyteddy-*.yaml || true
}

trap cleanup EXIT

# Parse arguments
ENVIRONMENT=${1:-staging}
STRATEGY=${2:-rolling}
VERSION=${3:-latest}
NAMESPACE="studyteddy-$ENVIRONMENT"

log "Starting Kubernetes deployment for StudyTeddy"
log "Environment: $ENVIRONMENT"
log "Strategy: $STRATEGY"
log "Version: $VERSION"
log "Namespace: $NAMESPACE"

# Validate environment
case $ENVIRONMENT in
    production|staging|development|canary)
        log "Valid environment: $ENVIRONMENT"
        ;;
    *)
        error_exit "Invalid environment: $ENVIRONMENT. Use: production, staging, development, or canary"
        ;;
esac

# Validate strategy
case $STRATEGY in
    rolling|blue-green|canary|recreate)
        log "Valid strategy: $STRATEGY"
        ;;
    *)
        error_exit "Invalid strategy: $STRATEGY. Use: rolling, blue-green, canary, or recreate"
        ;;
esac

# Set cluster configuration based on environment
case $ENVIRONMENT in
    production)
        CLUSTER_NAME="${EKS_PRODUCTION_CLUSTER:-studyteddy-prod}"
        AWS_REGION="${AWS_REGION:-us-east-1}"
        REPLICAS=3
        RESOURCE_REQUESTS_CPU="200m"
        RESOURCE_REQUESTS_MEMORY="512Mi"
        RESOURCE_LIMITS_CPU="1000m"
        RESOURCE_LIMITS_MEMORY="2Gi"
        ;;
    staging)
        CLUSTER_NAME="${EKS_STAGING_CLUSTER:-studyteddy-staging}"
        AWS_REGION="${AWS_REGION:-us-east-1}"
        REPLICAS=2
        RESOURCE_REQUESTS_CPU="100m"
        RESOURCE_REQUESTS_MEMORY="256Mi"
        RESOURCE_LIMITS_CPU="500m"
        RESOURCE_LIMITS_MEMORY="1Gi"
        ;;
    *)
        CLUSTER_NAME="${EKS_DEVELOPMENT_CLUSTER:-studyteddy-dev}"
        AWS_REGION="${AWS_REGION:-us-east-1}"
        REPLICAS=1
        RESOURCE_REQUESTS_CPU="100m"
        RESOURCE_REQUESTS_MEMORY="256Mi"
        RESOURCE_LIMITS_CPU="500m"
        RESOURCE_LIMITS_MEMORY="1Gi"
        ;;
esac

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error_exit "kubectl is not installed"
    fi

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error_exit "AWS CLI is not installed"
    fi

    # Check Helm
    if ! command -v helm &> /dev/null; then
        error_exit "Helm is not installed"
    fi

    # Update kubeconfig
    log "Updating kubeconfig for cluster: $CLUSTER_NAME"
    aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER_NAME" || error_exit "Failed to update kubeconfig"

    # Test cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi

    # Create namespace if it doesn't exist
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

    log "Prerequisites check passed"
}

# Load secrets and configurations
load_secrets() {
    log "Loading secrets and configurations..."

    # Create secret for database and Redis
    kubectl create secret generic app-secrets \
        --namespace="$NAMESPACE" \
        --from-literal=database-url="$DATABASE_URL" \
        --from-literal=redis-url="$REDIS_URL" \
        --from-literal=jwt-secret="$JWT_SECRET" \
        --from-literal=nextauth-secret="$NEXTAUTH_SECRET" \
        --from-literal=openai-api-key="$OPENAI_API_KEY" \
        --dry-run=client -o yaml | kubectl apply -f -

    # Create configmap for application config
    kubectl create configmap app-config \
        --namespace="$NAMESPACE" \
        --from-literal=node-env="$ENVIRONMENT" \
        --from-literal=next-public-api-url="$NEXT_PUBLIC_API_URL" \
        --from-literal=cors-origin="$CORS_ORIGIN" \
        --dry-run=client -o yaml | kubectl apply -f -
}

# Generate Kubernetes manifests
generate_manifests() {
    log "Generating Kubernetes manifests..."

    # Backend deployment
    cat > /tmp/studyteddy-backend-deployment.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-$ENVIRONMENT
  namespace: $NAMESPACE
  labels:
    app: backend-$ENVIRONMENT
    version: $VERSION
    environment: $ENVIRONMENT
spec:
  replicas: $REPLICAS
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: backend-$ENVIRONMENT
  template:
    metadata:
      labels:
        app: backend-$ENVIRONMENT
        version: $VERSION
        environment: $ENVIRONMENT
    spec:
      serviceAccountName: studyteddy-backend
      containers:
      - name: backend
        image: ghcr.io/mohamed-elkholy95/studyteddy/backend:$VERSION
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: node-env
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: redis-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: nextauth-secret
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: openai-api-key
        resources:
          requests:
            cpu: $RESOURCE_REQUESTS_CPU
            memory: $RESOURCE_REQUESTS_MEMORY
          limits:
            cpu: $RESOURCE_LIMITS_CPU
            memory: $RESOURCE_LIMITS_MEMORY
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 30
      terminationGracePeriodSeconds: 30
EOF

    # Frontend deployment
    cat > /tmp/studyteddy-frontend-deployment.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-$ENVIRONMENT
  namespace: $NAMESPACE
  labels:
    app: frontend-$ENVIRONMENT
    version: $VERSION
    environment: $ENVIRONMENT
spec:
  replicas: $REPLICAS
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: frontend-$ENVIRONMENT
  template:
    metadata:
      labels:
        app: frontend-$ENVIRONMENT
        version: $VERSION
        environment: $ENVIRONMENT
    spec:
      containers:
      - name: frontend
        image: ghcr.io/mohamed-elkholy95/studyteddy/frontend:$VERSION
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: node-env
        - name: NEXT_PUBLIC_API_URL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: next-public-api-url
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: nextauth-secret
        resources:
          requests:
            cpu: $RESOURCE_REQUESTS_CPU
            memory: $RESOURCE_REQUESTS_MEMORY
          limits:
            cpu: $RESOURCE_LIMITS_CPU
            memory: $RESOURCE_LIMITS_MEMORY
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
      terminationGracePeriodSeconds: 30
EOF

    # Services
    cat > /tmp/studyteddy-services.yaml << EOF
apiVersion: v1
kind: Service
metadata:
  name: backend-$ENVIRONMENT
  namespace: $NAMESPACE
  labels:
    app: backend-$ENVIRONMENT
spec:
  selector:
    app: backend-$ENVIRONMENT
  ports:
  - name: http
    port: 80
    targetPort: 3000
    protocol: TCP
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-$ENVIRONMENT
  namespace: $NAMESPACE
  labels:
    app: frontend-$ENVIRONMENT
spec:
  selector:
    app: frontend-$ENVIRONMENT
  ports:
  - name: http
    port: 80
    targetPort: 3000
    protocol: TCP
  type: ClusterIP
EOF

    # HPA (Horizontal Pod Autoscaler)
    if [[ "$ENVIRONMENT" == "production" ]]; then
        cat > /tmp/studyteddy-hpa.yaml << EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-$ENVIRONMENT-hpa
  namespace: $NAMESPACE
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-$ENVIRONMENT
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-$ENVIRONMENT-hpa
  namespace: $NAMESPACE
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend-$ENVIRONMENT
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
EOF
    fi

    # Ingress
    if [[ "$ENVIRONMENT" == "production" ]]; then
        DOMAIN="studyteddy.com"
        API_DOMAIN="api.studyteddy.com"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
        DOMAIN="staging.studyteddy.com"
        API_DOMAIN="api-staging.studyteddy.com"
    else
        DOMAIN="$ENVIRONMENT.studyteddy.com"
        API_DOMAIN="api-$ENVIRONMENT.studyteddy.com"
    fi

    cat > /tmp/studyteddy-ingress.yaml << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: studyteddy-$ENVIRONMENT
  namespace: $NAMESPACE
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - $DOMAIN
    - $API_DOMAIN
    secretName: studyteddy-$ENVIRONMENT-tls
  rules:
  - host: $DOMAIN
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-$ENVIRONMENT
            port:
              number: 80
  - host: $API_DOMAIN
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-$ENVIRONMENT
            port:
              number: 80
EOF

    log "Manifests generated successfully"
}

# Health check function
health_check() {
    local deployment_name=$1
    local timeout=${2:-300}

    log "Running health check for $deployment_name"

    # Wait for rollout to complete
    if ! kubectl rollout status deployment/$deployment_name -n "$NAMESPACE" --timeout="${timeout}s"; then
        error_exit "Health check failed for $deployment_name"
    fi

    # Wait for pods to be ready
    if ! kubectl wait --for=condition=ready pod -l app=$deployment_name -n "$NAMESPACE" --timeout="${timeout}s"; then
        error_exit "Pods not ready for $deployment_name"
    fi

    log "Health check passed for $deployment_name"
}

# Rolling deployment
deploy_rolling() {
    log "Executing rolling deployment..."

    # Apply manifests
    kubectl apply -f /tmp/studyteddy-backend-deployment.yaml
    kubectl apply -f /tmp/studyteddy-frontend-deployment.yaml
    kubectl apply -f /tmp/studyteddy-services.yaml
    kubectl apply -f /tmp/studyteddy-ingress.yaml

    # Apply HPA for production
    if [[ "$ENVIRONMENT" == "production" && -f /tmp/studyteddy-hpa.yaml ]]; then
        kubectl apply -f /tmp/studyteddy-hpa.yaml
    fi

    # Health checks
    health_check "backend-$ENVIRONMENT" 600
    health_check "frontend-$ENVIRONMENT" 600

    log "Rolling deployment completed successfully"
}

# Blue-green deployment
deploy_blue_green() {
    log "Executing blue-green deployment..."

    # Determine current color
    CURRENT_COLOR=$(kubectl get service backend-$ENVIRONMENT -n "$NAMESPACE" -o jsonpath='{.metadata.labels.color}' 2>/dev/null || echo "blue")
    NEW_COLOR=$([ "$CURRENT_COLOR" = "blue" ] && echo "green" || echo "blue")

    log "Current color: $CURRENT_COLOR, New color: $NEW_COLOR"

    # Create blue-green manifests
    sed "s/backend-$ENVIRONMENT/backend-$ENVIRONMENT-$NEW_COLOR/g; s/frontend-$ENVIRONMENT/frontend-$ENVIRONMENT-$NEW_COLOR/g" /tmp/studyteddy-backend-deployment.yaml > /tmp/studyteddy-backend-deployment-$NEW_COLOR.yaml
    sed "s/backend-$ENVIRONMENT/backend-$ENVIRONMENT-$NEW_COLOR/g; s/frontend-$ENVIRONMENT/frontend-$ENVIRONMENT-$NEW_COLOR/g" /tmp/studyteddy-frontend-deployment.yaml > /tmp/studyteddy-frontend-deployment-$NEW_COLOR.yaml

    # Add color labels
    sed -i "s/app: backend-$ENVIRONMENT/app: backend-$ENVIRONMENT\n    color: $NEW_COLOR/g" /tmp/studyteddy-backend-deployment-$NEW_COLOR.yaml
    sed -i "s/app: frontend-$ENVIRONMENT/app: frontend-$ENVIRONMENT\n    color: $NEW_COLOR/g" /tmp/studyteddy-frontend-deployment-$NEW_COLOR.yaml

    # Deploy new color
    kubectl apply -f /tmp/studyteddy-backend-deployment-$NEW_COLOR.yaml
    kubectl apply -f /tmp/studyteddy-frontend-deployment-$NEW_COLOR.yaml

    # Health checks for new deployment
    health_check "backend-$ENVIRONMENT-$NEW_COLOR" 600
    health_check "frontend-$ENVIRONMENT-$NEW_COLOR" 600

    # Switch traffic by updating service selectors
    kubectl patch service backend-$ENVIRONMENT -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"color\":\"$NEW_COLOR\"}}}"
    kubectl patch service frontend-$ENVIRONMENT -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"color\":\"$NEW_COLOR\"}}}"

    # Update service labels
    kubectl label service backend-$ENVIRONMENT -n "$NAMESPACE" color=$NEW_COLOR --overwrite
    kubectl label service frontend-$ENVIRONMENT -n "$NAMESPACE" color=$NEW_COLOR --overwrite

    # Wait for traffic switch to stabilize
    sleep 30

    # Final health check
    log "Running post-switch health checks..."
    kubectl get endpoints backend-$ENVIRONMENT -n "$NAMESPACE"
    kubectl get endpoints frontend-$ENVIRONMENT -n "$NAMESPACE"

    # Clean up old deployment
    kubectl delete deployment backend-$ENVIRONMENT-$CURRENT_COLOR -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete deployment frontend-$ENVIRONMENT-$CURRENT_COLOR -n "$NAMESPACE" --ignore-not-found=true

    log "Blue-green deployment completed successfully"
}

# Canary deployment
deploy_canary() {
    local traffic_split=${4:-10}
    log "Executing canary deployment with $traffic_split% traffic split..."

    # Deploy canary version
    sed "s/backend-$ENVIRONMENT/backend-$ENVIRONMENT-canary/g; s/frontend-$ENVIRONMENT/frontend-$ENVIRONMENT-canary/g" /tmp/studyteddy-backend-deployment.yaml > /tmp/studyteddy-backend-deployment-canary.yaml
    sed "s/backend-$ENVIRONMENT/backend-$ENVIRONMENT-canary/g; s/frontend-$ENVIRONMENT/frontend-$ENVIRONMENT-canary/g" /tmp/studyteddy-frontend-deployment.yaml > /tmp/studyteddy-frontend-deployment-canary.yaml

    # Reduce canary replicas
    sed -i "s/replicas: $REPLICAS/replicas: 1/g" /tmp/studyteddy-backend-deployment-canary.yaml
    sed -i "s/replicas: $REPLICAS/replicas: 1/g" /tmp/studyteddy-frontend-deployment-canary.yaml

    # Apply canary deployments
    kubectl apply -f /tmp/studyteddy-backend-deployment-canary.yaml
    kubectl apply -f /tmp/studyteddy-frontend-deployment-canary.yaml

    # Health checks for canary
    health_check "backend-$ENVIRONMENT-canary" 600
    health_check "frontend-$ENVIRONMENT-canary" 600

    # Create Istio VirtualService for traffic splitting (if Istio is available)
    if kubectl get crd virtualservices.networking.istio.io &> /dev/null; then
        cat > /tmp/studyteddy-virtualservice.yaml << EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: studyteddy-$ENVIRONMENT
  namespace: $NAMESPACE
spec:
  hosts:
  - backend-$ENVIRONMENT
  - frontend-$ENVIRONMENT
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: backend-$ENVIRONMENT-canary
  - route:
    - destination:
        host: backend-$ENVIRONMENT
      weight: $((100 - traffic_split))
    - destination:
        host: backend-$ENVIRONMENT-canary
      weight: $traffic_split
EOF
        kubectl apply -f /tmp/studyteddy-virtualservice.yaml
    fi

    log "Canary deployment completed. Monitor metrics and promote/rollback as needed."
}

# Recreate deployment
deploy_recreate() {
    log "Executing recreate deployment..."

    # Delete existing deployments
    kubectl delete deployment backend-$ENVIRONMENT -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete deployment frontend-$ENVIRONMENT -n "$NAMESPACE" --ignore-not-found=true

    # Wait for pods to terminate
    kubectl wait --for=delete pod -l app=backend-$ENVIRONMENT -n "$NAMESPACE" --timeout=300s || true
    kubectl wait --for=delete pod -l app=frontend-$ENVIRONMENT -n "$NAMESPACE" --timeout=300s || true

    # Deploy new version
    kubectl apply -f /tmp/studyteddy-backend-deployment.yaml
    kubectl apply -f /tmp/studyteddy-frontend-deployment.yaml
    kubectl apply -f /tmp/studyteddy-services.yaml
    kubectl apply -f /tmp/studyteddy-ingress.yaml

    # Health checks
    health_check "backend-$ENVIRONMENT" 600
    health_check "frontend-$ENVIRONMENT" 600

    log "Recreate deployment completed successfully"
}

# Database migration
run_migrations() {
    log "Running database migrations..."

    # Create migration job
    cat > /tmp/studyteddy-migration-job.yaml << EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: migration-$VERSION-$(date +%s)
  namespace: $NAMESPACE
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migration
        image: ghcr.io/mohamed-elkholy95/studyteddy/backend:$VERSION
        command: ["bun", "run", "db:migrate"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
      backoffLimit: 3
EOF

    kubectl apply -f /tmp/studyteddy-migration-job.yaml

    # Wait for migration to complete
    kubectl wait --for=condition=complete job -l job-name=migration-$VERSION --timeout=600s -n "$NAMESPACE" || error_exit "Database migration failed"

    log "Database migrations completed"
}

# Backup creation
create_backup() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "Creating backup before production deployment..."

        # Create backup job
        cat > /tmp/studyteddy-backup-job.yaml << EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: backup-$(date +%s)
  namespace: $NAMESPACE
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: backup
        image: postgres:16-alpine
        command: ["sh", "-c"]
        args:
        - |
          pg_dump \$DATABASE_URL > /backup/backup-$(date +%Y%m%d-%H%M%S).sql
          echo "Backup completed"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        volumeMounts:
        - name: backup-storage
          mountPath: /backup
      volumes:
      - name: backup-storage
        persistentVolumeClaim:
          claimName: backup-pvc
      backoffLimit: 1
EOF

        kubectl apply -f /tmp/studyteddy-backup-job.yaml
        kubectl wait --for=condition=complete job -l job-name=backup --timeout=300s -n "$NAMESPACE" || log "WARNING: Backup job failed or timed out"
    fi
}

# Rollback function
rollback() {
    local rollback_version=${1:-previous}
    log "Rolling back to version: $rollback_version"

    # Get previous deployment revision
    if [[ "$rollback_version" == "previous" ]]; then
        kubectl rollout undo deployment/backend-$ENVIRONMENT -n "$NAMESPACE"
        kubectl rollout undo deployment/frontend-$ENVIRONMENT -n "$NAMESPACE"
    else
        # Rollback to specific version
        kubectl set image deployment/backend-$ENVIRONMENT -n "$NAMESPACE" backend=ghcr.io/mohamed-elkholy95/studyteddy/backend:$rollback_version
        kubectl set image deployment/frontend-$ENVIRONMENT -n "$NAMESPACE" frontend=ghcr.io/mohamed-elkholy95/studyteddy/frontend:$rollback_version
    fi

    # Wait for rollback to complete
    health_check "backend-$ENVIRONMENT" 300
    health_check "frontend-$ENVIRONMENT" 300

    log "Rollback completed successfully"
}

# Post-deployment verification
post_deployment_verification() {
    log "Running post-deployment verification..."

    # Check pod status
    kubectl get pods -n "$NAMESPACE" -l environment="$ENVIRONMENT"

    # Check service endpoints
    kubectl get endpoints -n "$NAMESPACE"

    # Check ingress
    kubectl get ingress -n "$NAMESPACE"

    # Application health checks
    log "Testing application endpoints..."

    # Get service IPs for internal testing
    BACKEND_SERVICE_IP=$(kubectl get service backend-$ENVIRONMENT -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')
    FRONTEND_SERVICE_IP=$(kubectl get service frontend-$ENVIRONMENT -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')

    # Test backend health
    kubectl run health-check-pod --rm -i --restart=Never --image=curlimages/curl -- \
        curl -f "http://$BACKEND_SERVICE_IP/health" || error_exit "Backend health check failed"

    # Test frontend
    kubectl run frontend-check-pod --rm -i --restart=Never --image=curlimages/curl -- \
        curl -f "http://$FRONTEND_SERVICE_IP/" || error_exit "Frontend check failed"

    log "Post-deployment verification passed"
}

# Main deployment function
main() {
    log "Starting Kubernetes deployment process..."

    # Check if this is a rollback
    if [[ "$1" == "rollback" ]]; then
        check_prerequisites
        rollback "$2"
        return 0
    fi

    # Pre-deployment
    check_prerequisites
    load_secrets
    create_backup
    generate_manifests
    run_migrations

    # Execute deployment strategy
    case $STRATEGY in
        rolling)
            deploy_rolling
            ;;
        blue-green)
            deploy_blue_green
            ;;
        canary)
            deploy_canary
            ;;
        recreate)
            deploy_recreate
            ;;
    esac

    # Post-deployment
    post_deployment_verification

    # Send success notification
    send_alert "deployment_success" "Deployment completed successfully. Version: $VERSION"

    log "Kubernetes deployment completed successfully!"
    log "Deployment log saved to: $DEPLOY_LOG"
}

# Handle help
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    cat << EOF
Kubernetes Deployment Script for StudyTeddy

Usage:
    $0 [environment] [strategy] [version]
    $0 rollback [version]

Arguments:
    environment    Target environment (production, staging, development, canary)
    strategy       Deployment strategy (rolling, blue-green, canary, recreate)
    version        Docker image version tag (default: latest)

Examples:
    $0 staging rolling v1.2.3
    $0 production blue-green latest
    $0 canary canary v1.2.3 20
    $0 rollback previous

Environment Variables Required:
    DATABASE_URL              Database connection string
    REDIS_URL                Redis connection string
    JWT_SECRET               JWT signing secret
    NEXTAUTH_SECRET          NextAuth secret
    OPENAI_API_KEY           OpenAI API key
    NEXT_PUBLIC_API_URL      Public API URL
    AWS_REGION               AWS region for EKS
    EKS_PRODUCTION_CLUSTER   Production EKS cluster name
    EKS_STAGING_CLUSTER      Staging EKS cluster name
    SLACK_WEBHOOK_URL        Slack webhook for notifications (optional)

EOF
    exit 0
fi

# Execute main function
main "$@"