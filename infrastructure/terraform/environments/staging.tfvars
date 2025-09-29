# Staging Environment Configuration for StudyTeddy

# Basic Configuration
environment    = "staging"
project_name   = "studyteddy"
aws_region     = "us-east-1"

# Network Configuration
vpc_cidr = "10.1.0.0/16"

# Domain Configuration
domain_name     = "staging.studyteddy.com"
hosted_zone_id  = "Z1D633PJN98FT9"  # Replace with actual hosted zone ID

# EKS Configuration
kubernetes_version   = "1.28"
node_instance_types  = ["t3.medium"]
node_min_size       = 1
node_max_size       = 5
node_desired_size   = 2

# Database Configuration
db_instance_class        = "db.t3.micro"
db_allocated_storage     = 20
db_max_allocated_storage = 100
db_name                  = "studyteddy_staging"
db_username              = "studyteddy"

# Redis Configuration
redis_node_type      = "cache.t3.micro"
redis_num_cache_nodes = 1

# Application Configuration
app_replicas       = 2
app_cpu_request    = "100m"
app_memory_request = "256Mi"
app_cpu_limit      = "500m"
app_memory_limit   = "1Gi"

# Monitoring and Observability
enable_monitoring = true
enable_logging    = true
enable_prometheus = true
enable_grafana    = true
enable_fluentd    = true

# Security Features
enable_waf         = false
enable_shield      = false
enable_guardduty   = true
enable_security_hub = false

# Compliance and Governance
enable_aws_config  = false
enable_cloudtrail  = true

# Backup and Disaster Recovery
backup_retention_days      = 7
enable_cross_region_backup = false

# Cost Optimization
enable_spot_instances = true

# Auto Scaling
enable_cluster_autoscaler           = true
enable_horizontal_pod_autoscaler    = true
enable_vertical_pod_autoscaler      = false

# Service Mesh and Advanced Features
enable_istio             = false
enable_external_secrets  = true
enable_cert_manager      = true
enable_nginx_ingress     = true

# Data Retention
log_retention_days     = 7
metrics_retention_days = 7

# Performance Optimizations
enable_enhanced_networking = false
enable_placement_groups   = false

# SSL Certificate
ssl_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/staging-12345678-1234-1234-1234-123456789012"

# Notification Configuration
alert_email = "staging-alerts@studyteddy.com"

# AWS Auth Users (Replace with actual user ARNs and details)
aws_auth_users = [
  {
    userarn  = "arn:aws:iam::123456789012:user/staging-admin"
    username = "staging-admin"
    groups   = ["system:masters"]
  },
  {
    userarn  = "arn:aws:iam::123456789012:user/developer1"
    username = "developer1"
    groups   = ["system:authenticated"]
  }
]

# AWS Auth Roles
aws_auth_roles = [
  {
    rolearn  = "arn:aws:iam::123456789012:role/StudyTeddyStagingDeveloper"
    username = "staging-developer"
    groups   = ["system:authenticated"]
  }
]

# Environment-specific overrides (automatically applied)
environment_config = {
  staging = {
    node_instance_types    = ["t3.medium"]
    node_min_size         = 1
    node_max_size         = 5
    node_desired_size     = 2
    db_instance_class     = "db.t3.micro"
    redis_node_type       = "cache.t3.micro"
    backup_retention_days = 7
    enable_spot_instances = true
  }
}