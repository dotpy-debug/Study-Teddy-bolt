#!/bin/bash

# StudyTeddy Monitoring Setup Script
# Comprehensive monitoring stack setup with Prometheus, Grafana, and alerting
# Usage: ./setup-monitoring.sh [environment] [action]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MONITORING_LOG="$PROJECT_ROOT/logs/monitoring-setup-$(date +%Y%m%d-%H%M%S).log"

# Ensure log directory exists
mkdir -p "$(dirname "$MONITORING_LOG")"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$MONITORING_LOG"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Parse arguments
ENVIRONMENT=${1:-staging}
ACTION=${2:-setup}

log "Starting monitoring setup for StudyTeddy"
log "Environment: $ENVIRONMENT"
log "Action: $ACTION"

# Validate environment
case $ENVIRONMENT in
    production|staging|development|local)
        log "Valid environment: $ENVIRONMENT"
        ;;
    *)
        error_exit "Invalid environment: $ENVIRONMENT. Use: production, staging, development, or local"
        ;;
esac

# Validate action
case $ACTION in
    setup|update|remove|status)
        log "Valid action: $ACTION"
        ;;
    *)
        error_exit "Invalid action: $ACTION. Use: setup, update, remove, or status"
        ;;
esac

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error_exit "kubectl is not installed"
    fi

    # Check Helm
    if ! command -v helm &> /dev/null; then
        error_exit "Helm is not installed"
    fi

    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi

    # Create namespace if it doesn't exist
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

    log "Prerequisites check passed"
}

# Setup Prometheus
setup_prometheus() {
    log "Setting up Prometheus..."

    # Add Prometheus community Helm repository
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update

    # Create Prometheus values file
    cat > /tmp/prometheus-values.yaml << EOF
prometheus:
  prometheusSpec:
    retention: ${PROMETHEUS_RETENTION:-30d}
    retentionSize: ${PROMETHEUS_RETENTION_SIZE:-50GB}
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: ${STORAGE_CLASS:-gp3}
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: ${PROMETHEUS_STORAGE:-100Gi}

    resources:
      requests:
        cpu: ${PROMETHEUS_CPU_REQUEST:-500m}
        memory: ${PROMETHEUS_MEMORY_REQUEST:-2Gi}
      limits:
        cpu: ${PROMETHEUS_CPU_LIMIT:-2000m}
        memory: ${PROMETHEUS_MEMORY_LIMIT:-8Gi}

    ruleSelector: {}
    serviceMonitorSelector: {}
    podMonitorSelector: {}

    additionalScrapeConfigs:
      - job_name: 'studyteddy-backend'
        kubernetes_sd_configs:
          - role: endpoints
            namespaces:
              names:
                - studyteddy-${ENVIRONMENT}
        relabel_configs:
          - source_labels: [__meta_kubernetes_service_name]
            action: keep
            regex: backend-${ENVIRONMENT}
          - source_labels: [__meta_kubernetes_endpoint_port_name]
            action: keep
            regex: metrics

      - job_name: 'studyteddy-frontend'
        kubernetes_sd_configs:
          - role: endpoints
            namespaces:
              names:
                - studyteddy-${ENVIRONMENT}
        relabel_configs:
          - source_labels: [__meta_kubernetes_service_name]
            action: keep
            regex: frontend-${ENVIRONMENT}
          - source_labels: [__meta_kubernetes_endpoint_port_name]
            action: keep
            regex: metrics

alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: ${STORAGE_CLASS:-gp3}
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: ${ALERTMANAGER_STORAGE:-10Gi}

    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 1Gi

  config:
    global:
      slack_api_url: '${SLACK_WEBHOOK_URL}'
      smtp_smarthost: '${SMTP_HOST}:${SMTP_PORT}'
      smtp_from: '${ALERT_EMAIL}'

    templates:
      - '/etc/alertmanager/templates/*.tmpl'

    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 1h
      receiver: 'default-receiver'
      routes:
        - match:
            severity: critical
          receiver: 'critical-alerts'
          continue: true
        - match:
            severity: warning
          receiver: 'warning-alerts'
          continue: true
        - match:
            team: security
          receiver: 'security-alerts'
          continue: true

    receivers:
      - name: 'default-receiver'
        webhook_configs:
          - url: 'http://studyteddy-webhook-service.monitoring.svc.cluster.local:9093/alerts'
            send_resolved: true

      - name: 'critical-alerts'
        slack_configs:
          - channel: '#alerts-critical'
            title: 'StudyTeddy Critical Alert'
            text: |
              {{ range .Alerts }}
              *Alert:* {{ .Annotations.summary }}
              *Description:* {{ .Annotations.description }}
              *Severity:* {{ .Labels.severity }}
              *Service:* {{ .Labels.service }}
              *Runbook:* {{ .Annotations.runbook_url }}
              {{ end }}
            send_resolved: true
        email_configs:
          - to: '${CRITICAL_ALERT_EMAIL}'
            subject: 'StudyTeddy Critical Alert'
            body: |
              {{ range .Alerts }}
              Alert: {{ .Annotations.summary }}
              Description: {{ .Annotations.description }}
              Severity: {{ .Labels.severity }}
              Service: {{ .Labels.service }}
              Runbook: {{ .Annotations.runbook_url }}
              {{ end }}

      - name: 'warning-alerts'
        slack_configs:
          - channel: '#alerts-warning'
            title: 'StudyTeddy Warning Alert'
            text: |
              {{ range .Alerts }}
              *Alert:* {{ .Annotations.summary }}
              *Description:* {{ .Annotations.description }}
              *Severity:* {{ .Labels.severity }}
              *Service:* {{ .Labels.service }}
              {{ end }}
            send_resolved: true

      - name: 'security-alerts'
        slack_configs:
          - channel: '#security-alerts'
            title: 'StudyTeddy Security Alert'
            text: |
              {{ range .Alerts }}
              🚨 *Security Alert:* {{ .Annotations.summary }}
              *Description:* {{ .Annotations.description }}
              *Severity:* {{ .Labels.severity }}
              *Service:* {{ .Labels.service }}
              *Runbook:* {{ .Annotations.runbook_url }}
              {{ end }}
            send_resolved: true
        email_configs:
          - to: '${SECURITY_ALERT_EMAIL}'
            subject: 'StudyTeddy Security Alert'
            body: |
              {{ range .Alerts }}
              Security Alert: {{ .Annotations.summary }}
              Description: {{ .Annotations.description }}
              Severity: {{ .Labels.severity }}
              Service: {{ .Labels.service }}
              Runbook: {{ .Annotations.runbook_url }}
              {{ end }}

grafana:
  enabled: true
  adminPassword: '${GRAFANA_ADMIN_PASSWORD:-StudyTeddy123!}'

  persistence:
    enabled: true
    storageClassName: ${STORAGE_CLASS:-gp3}
    size: ${GRAFANA_STORAGE:-20Gi}

  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 1Gi

  ingress:
    enabled: ${ENABLE_INGRESS:-true}
    annotations:
      kubernetes.io/ingress.class: nginx
      cert-manager.io/cluster-issuer: letsencrypt-prod
      nginx.ingress.kubernetes.io/auth-type: basic
      nginx.ingress.kubernetes.io/auth-secret: monitoring/grafana-auth
    hosts:
      - grafana-${ENVIRONMENT}.studyteddy.com
    tls:
      - secretName: grafana-tls
        hosts:
          - grafana-${ENVIRONMENT}.studyteddy.com

  sidecar:
    dashboards:
      enabled: true
      searchNamespace: ALL
      folderAnnotation: grafana_folder
      provider:
        foldersFromFilesStructure: true
    datasources:
      enabled: true
      searchNamespace: ALL

kubeStateMetrics:
  enabled: true

nodeExporter:
  enabled: true

prometheusOperator:
  enabled: true
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 1Gi
EOF

    # Install/upgrade Prometheus stack
    if helm list -n monitoring | grep -q kube-prometheus-stack; then
        log "Upgrading Prometheus stack..."
        helm upgrade kube-prometheus-stack prometheus-community/kube-prometheus-stack \
            --namespace monitoring \
            --values /tmp/prometheus-values.yaml \
            --timeout 600s
    else
        log "Installing Prometheus stack..."
        helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
            --namespace monitoring \
            --values /tmp/prometheus-values.yaml \
            --timeout 600s \
            --create-namespace
    fi

    # Wait for deployment
    kubectl wait --for=condition=available deployment/kube-prometheus-stack-grafana -n monitoring --timeout=300s
    kubectl wait --for=condition=available deployment/kube-prometheus-stack-operator -n monitoring --timeout=300s

    log "Prometheus stack setup completed"
}

# Setup custom alert rules
setup_alert_rules() {
    log "Setting up custom alert rules..."

    # Apply custom alert rules
    kubectl apply -f "$PROJECT_ROOT/monitoring/prometheus/alerts.yml"

    # Create PrometheusRule custom resource
    cat > /tmp/studyteddy-alerts.yaml << EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: studyteddy-alerts
  namespace: monitoring
  labels:
    app: kube-prometheus-stack
    release: kube-prometheus-stack
spec:
EOF

    # Convert alerts.yml to PrometheusRule format
    yq eval '.groups' "$PROJECT_ROOT/monitoring/prometheus/alerts.yml" >> /tmp/studyteddy-alerts.yaml

    kubectl apply -f /tmp/studyteddy-alerts.yaml

    log "Alert rules setup completed"
}

# Setup Grafana dashboards
setup_grafana_dashboards() {
    log "Setting up Grafana dashboards..."

    # Create dashboard ConfigMaps
    kubectl create configmap studyteddy-overview-dashboard \
        --from-file="$PROJECT_ROOT/monitoring/grafana/dashboards/studyteddy-overview.json" \
        -n monitoring \
        --dry-run=client -o yaml | kubectl apply -f -

    # Label the ConfigMap for Grafana sidecar
    kubectl label configmap studyteddy-overview-dashboard \
        grafana_dashboard=1 \
        grafana_folder=StudyTeddy \
        -n monitoring

    # Create additional dashboards
    create_performance_dashboard
    create_business_dashboard
    create_security_dashboard

    log "Grafana dashboards setup completed"
}

# Create performance dashboard
create_performance_dashboard() {
    log "Creating performance dashboard..."

    cat > /tmp/performance-dashboard.json << 'EOF'
{
  "dashboard": {
    "title": "StudyTeddy - Performance",
    "tags": ["studyteddy", "performance"],
    "panels": [
      {
        "title": "Response Time Heatmap",
        "type": "heatmap",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_bucket{job=~\"studyteddy-.*\"}[5m])"
          }
        ]
      },
      {
        "title": "Throughput",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=~\"studyteddy-.*\"}[5m])"
          }
        ]
      }
    ]
  }
}
EOF

    kubectl create configmap studyteddy-performance-dashboard \
        --from-file=/tmp/performance-dashboard.json \
        -n monitoring \
        --dry-run=client -o yaml | kubectl apply -f -

    kubectl label configmap studyteddy-performance-dashboard \
        grafana_dashboard=1 \
        grafana_folder=StudyTeddy \
        -n monitoring
}

# Create business metrics dashboard
create_business_dashboard() {
    log "Creating business metrics dashboard..."

    cat > /tmp/business-dashboard.json << 'EOF'
{
  "dashboard": {
    "title": "StudyTeddy - Business Metrics",
    "tags": ["studyteddy", "business"],
    "panels": [
      {
        "title": "User Registrations",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(user_registrations_total[1h])"
          }
        ]
      },
      {
        "title": "Study Sessions",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(study_sessions_started_total[1h])"
          }
        ]
      }
    ]
  }
}
EOF

    kubectl create configmap studyteddy-business-dashboard \
        --from-file=/tmp/business-dashboard.json \
        -n monitoring \
        --dry-run=client -o yaml | kubectl apply -f -

    kubectl label configmap studyteddy-business-dashboard \
        grafana_dashboard=1 \
        grafana_folder=StudyTeddy \
        -n monitoring
}

# Create security dashboard
create_security_dashboard() {
    log "Creating security dashboard..."

    cat > /tmp/security-dashboard.json << 'EOF'
{
  "dashboard": {
    "title": "StudyTeddy - Security",
    "tags": ["studyteddy", "security"],
    "panels": [
      {
        "title": "Failed Login Attempts",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(auth_failed_attempts_total[5m])"
          }
        ]
      },
      {
        "title": "Unauthorized Access",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=\"401\"}[5m])"
          }
        ]
      }
    ]
  }
}
EOF

    kubectl create configmap studyteddy-security-dashboard \
        --from-file=/tmp/security-dashboard.json \
        -n monitoring \
        --dry-run=client -o yaml | kubectl apply -f -

    kubectl label configmap studyteddy-security-dashboard \
        grafana_dashboard=1 \
        grafana_folder=StudyTeddy \
        -n monitoring
}

# Setup log aggregation
setup_log_aggregation() {
    log "Setting up log aggregation..."

    # Add Fluent Helm repository
    helm repo add fluent https://fluent.github.io/helm-charts
    helm repo update

    # Create Fluentd values
    cat > /tmp/fluentd-values.yaml << EOF
image:
  repository: fluent/fluentd-kubernetes-daemonset
  tag: v1.16-debian-cloudwatch-1

env:
  - name: AWS_REGION
    value: "${AWS_REGION:-us-east-1}"
  - name: CLUSTER_NAME
    value: "studyteddy-${ENVIRONMENT}"
  - name: LOG_GROUP_NAME
    value: "/aws/eks/studyteddy-${ENVIRONMENT}/application"

resources:
  requests:
    cpu: 100m
    memory: 200Mi
  limits:
    cpu: 500m
    memory: 500Mi

serviceAccount:
  create: true
  annotations:
    eks.amazonaws.com/role-arn: "${FLUENTD_IAM_ROLE_ARN}"

tolerations:
  - key: node-role.kubernetes.io/master
    effect: NoSchedule
EOF

    # Install/upgrade Fluentd
    if helm list -n monitoring | grep -q fluentd; then
        helm upgrade fluentd fluent/fluentd \
            --namespace monitoring \
            --values /tmp/fluentd-values.yaml
    else
        helm install fluentd fluent/fluentd \
            --namespace monitoring \
            --values /tmp/fluentd-values.yaml
    fi

    log "Log aggregation setup completed"
}

# Setup service monitors
setup_service_monitors() {
    log "Setting up service monitors..."

    # Create ServiceMonitor for backend
    cat > /tmp/backend-servicemonitor.yaml << EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: studyteddy-backend
  namespace: monitoring
  labels:
    app: studyteddy-backend
    release: kube-prometheus-stack
spec:
  selector:
    matchLabels:
      app: backend-${ENVIRONMENT}
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
  namespaceSelector:
    matchNames:
    - studyteddy-${ENVIRONMENT}
EOF

    kubectl apply -f /tmp/backend-servicemonitor.yaml

    # Create ServiceMonitor for frontend
    cat > /tmp/frontend-servicemonitor.yaml << EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: studyteddy-frontend
  namespace: monitoring
  labels:
    app: studyteddy-frontend
    release: kube-prometheus-stack
spec:
  selector:
    matchLabels:
      app: frontend-${ENVIRONMENT}
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
  namespaceSelector:
    matchNames:
    - studyteddy-${ENVIRONMENT}
EOF

    kubectl apply -f /tmp/frontend-servicemonitor.yaml

    log "Service monitors setup completed"
}

# Setup external monitoring
setup_external_monitoring() {
    log "Setting up external monitoring..."

    # Install blackbox exporter for external monitoring
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update

    cat > /tmp/blackbox-values.yaml << EOF
config:
  modules:
    http_2xx:
      prober: http
      timeout: 5s
      http:
        valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
        valid_status_codes: []
        method: GET
        headers:
          Host: studyteddy.com
          Accept-Language: en-US
        no_follow_redirects: false
        fail_if_ssl: false
        fail_if_not_ssl: true
        tls_config:
          insecure_skip_verify: false
        preferred_ip_protocol: "ip4"

serviceMonitor:
  enabled: true
  targets:
    - name: studyteddy.com
      url: https://studyteddy.com
      module: http_2xx
    - name: api.studyteddy.com
      url: https://api.studyteddy.com/health
      module: http_2xx
EOF

    if helm list -n monitoring | grep -q blackbox-exporter; then
        helm upgrade blackbox-exporter prometheus-community/prometheus-blackbox-exporter \
            --namespace monitoring \
            --values /tmp/blackbox-values.yaml
    else
        helm install blackbox-exporter prometheus-community/prometheus-blackbox-exporter \
            --namespace monitoring \
            --values /tmp/blackbox-values.yaml
    fi

    log "External monitoring setup completed"
}

# Setup notification channels
setup_notifications() {
    log "Setting up notification channels..."

    # Create basic auth secret for Grafana
    if [[ -n "$GRAFANA_AUTH_USER" && -n "$GRAFANA_AUTH_PASSWORD" ]]; then
        htpasswd -bc /tmp/auth "$GRAFANA_AUTH_USER" "$GRAFANA_AUTH_PASSWORD"
        kubectl create secret generic grafana-auth \
            --from-file=auth=/tmp/auth \
            -n monitoring \
            --dry-run=client -o yaml | kubectl apply -f -
        rm -f /tmp/auth
    fi

    # Create webhook service for custom notifications
    cat > /tmp/webhook-service.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: studyteddy-webhook-service
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: studyteddy-webhook-service
  template:
    metadata:
      labels:
        app: studyteddy-webhook-service
    spec:
      containers:
      - name: webhook
        image: nginx:alpine
        ports:
        - containerPort: 9093
        env:
        - name: SLACK_WEBHOOK_URL
          value: "${SLACK_WEBHOOK_URL}"
        - name: DISCORD_WEBHOOK_URL
          value: "${DISCORD_WEBHOOK_URL}"
---
apiVersion: v1
kind: Service
metadata:
  name: studyteddy-webhook-service
  namespace: monitoring
spec:
  selector:
    app: studyteddy-webhook-service
  ports:
  - port: 9093
    targetPort: 9093
EOF

    kubectl apply -f /tmp/webhook-service.yaml

    log "Notification channels setup completed"
}

# Get monitoring status
get_monitoring_status() {
    log "Getting monitoring status..."

    echo ""
    echo "=== Monitoring Stack Status ==="
    echo ""

    # Check Helm releases
    echo "Helm Releases:"
    helm list -n monitoring

    echo ""
    echo "Pods Status:"
    kubectl get pods -n monitoring

    echo ""
    echo "Services:"
    kubectl get services -n monitoring

    echo ""
    echo "Ingresses:"
    kubectl get ingress -n monitoring

    echo ""
    echo "PrometheusRules:"
    kubectl get prometheusrules -n monitoring

    echo ""
    echo "ServiceMonitors:"
    kubectl get servicemonitors -n monitoring

    # Check if services are responding
    echo ""
    echo "Health Checks:"

    # Port forward and check Prometheus
    kubectl port-forward svc/kube-prometheus-stack-prometheus 9090:9090 -n monitoring &
    PORT_FORWARD_PID=$!
    sleep 5

    if curl -s http://localhost:9090/-/ready > /dev/null; then
        echo "✅ Prometheus is ready"
    else
        echo "❌ Prometheus is not ready"
    fi

    kill $PORT_FORWARD_PID 2>/dev/null || true

    # Check Grafana
    kubectl port-forward svc/kube-prometheus-stack-grafana 3000:80 -n monitoring &
    PORT_FORWARD_PID=$!
    sleep 5

    if curl -s http://localhost:3000/api/health > /dev/null; then
        echo "✅ Grafana is ready"
    else
        echo "❌ Grafana is not ready"
    fi

    kill $PORT_FORWARD_PID 2>/dev/null || true

    echo ""
    echo "Access URLs:"
    echo "Prometheus: kubectl port-forward svc/kube-prometheus-stack-prometheus 9090:9090 -n monitoring"
    echo "Grafana: kubectl port-forward svc/kube-prometheus-stack-grafana 3000:80 -n monitoring"
    echo "AlertManager: kubectl port-forward svc/kube-prometheus-stack-alertmanager 9093:9093 -n monitoring"
}

# Remove monitoring stack
remove_monitoring() {
    log "Removing monitoring stack..."

    # Remove Helm releases
    helm uninstall kube-prometheus-stack -n monitoring || true
    helm uninstall fluentd -n monitoring || true
    helm uninstall blackbox-exporter -n monitoring || true

    # Remove custom resources
    kubectl delete prometheusrules --all -n monitoring || true
    kubectl delete servicemonitors --all -n monitoring || true

    # Remove ConfigMaps
    kubectl delete configmap -l grafana_dashboard=1 -n monitoring || true

    # Remove namespace (optional)
    read -p "Do you want to remove the monitoring namespace? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl delete namespace monitoring || true
    fi

    log "Monitoring stack removed"
}

# Load environment variables
load_environment() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"

    if [[ -f "$env_file" ]]; then
        log "Loading environment variables from $env_file"
        # Load environment variables
        set -a
        source "$env_file"
        set +a
    else
        log "Warning: Environment file not found: $env_file"
    fi

    # Set defaults
    PROMETHEUS_RETENTION=${PROMETHEUS_RETENTION:-30d}
    PROMETHEUS_STORAGE=${PROMETHEUS_STORAGE:-100Gi}
    GRAFANA_STORAGE=${GRAFANA_STORAGE:-20Gi}
    STORAGE_CLASS=${STORAGE_CLASS:-gp3}
    ENABLE_INGRESS=${ENABLE_INGRESS:-true}
}

# Main function
main() {
    load_environment

    case $ACTION in
        setup)
            check_prerequisites
            setup_prometheus
            setup_alert_rules
            setup_grafana_dashboards
            setup_service_monitors
            setup_log_aggregation
            setup_external_monitoring
            setup_notifications
            get_monitoring_status
            ;;
        update)
            setup_prometheus
            setup_alert_rules
            setup_grafana_dashboards
            ;;
        remove)
            remove_monitoring
            ;;
        status)
            get_monitoring_status
            ;;
    esac

    log "Monitoring setup completed for $ENVIRONMENT environment"
    log "Setup log saved to: $MONITORING_LOG"
}

# Handle help
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    cat << EOF
StudyTeddy Monitoring Setup Script

Usage: $0 [environment] [action]

Arguments:
    environment    Target environment (production, staging, development, local)
    action         Action to perform (setup, update, remove, status)

Examples:
    $0 staging setup
    $0 production update
    $0 development status
    $0 staging remove

Environment Variables:
    PROMETHEUS_RETENTION         Data retention period (default: 30d)
    PROMETHEUS_STORAGE          Storage size (default: 100Gi)
    GRAFANA_STORAGE             Grafana storage (default: 20Gi)
    STORAGE_CLASS               Kubernetes storage class (default: gp3)
    SLACK_WEBHOOK_URL           Slack webhook for alerts
    DISCORD_WEBHOOK_URL         Discord webhook for alerts
    GRAFANA_ADMIN_PASSWORD      Grafana admin password
    CRITICAL_ALERT_EMAIL        Email for critical alerts
    SECURITY_ALERT_EMAIL        Email for security alerts

EOF
    exit 0
fi

# Execute main function
main "$@"