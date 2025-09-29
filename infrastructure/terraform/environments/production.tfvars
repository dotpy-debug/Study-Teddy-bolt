# Production Environment Configuration for StudyTeddy

# Basic Configuration
environment    = "production"
project_name   = "studyteddy"
aws_region     = "us-east-1"

# Network Configuration
vpc_cidr = "10.0.0.0/16"

# Domain Configuration
domain_name     = "studyteddy.com"
hosted_zone_id  = "Z1D633PJN98FT9"  # Replace with actual hosted zone ID

# EKS Configuration
kubernetes_version   = "1.28"
node_instance_types  = ["t3.large", "t3a.large"]
node_min_size       = 3
node_max_size       = 20
node_desired_size   = 3

# Database Configuration
db_instance_class        = "db.t3.small"
db_allocated_storage     = 100
db_max_allocated_storage = 1000
db_name                  = "studyteddy"
db_username              = "studyteddy"

# Redis Configuration
redis_node_type      = "cache.t3.small"
redis_num_cache_nodes = 3

# Application Configuration
app_replicas       = 3
app_cpu_request    = "200m"
app_memory_request = "512Mi"
app_cpu_limit      = "1000m"
app_memory_limit   = "2Gi"

# Monitoring and Observability
enable_monitoring = true
enable_logging    = true
enable_prometheus = true
enable_grafana    = true
enable_fluentd    = true

# Security Features
enable_waf         = true
enable_shield      = true
enable_guardduty   = true
enable_security_hub = true

# Compliance and Governance
enable_aws_config  = true
enable_cloudtrail  = true

# Backup and Disaster Recovery
backup_retention_days      = 30
enable_cross_region_backup = true
backup_region             = "us-west-2"

# Cost Optimization
enable_spot_instances = false

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
log_retention_days     = 30
metrics_retention_days = 30

# Performance Optimizations
enable_enhanced_networking = true
enable_placement_groups   = true

# SSL Certificate
ssl_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"

# Notification Configuration
alert_email = "alerts@studyteddy.com"

# AWS Auth Users (Replace with actual user ARNs and details)
aws_auth_users = [
  {
    userarn  = "arn:aws:iam::123456789012:user/admin"
    username = "admin"
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
    rolearn  = "arn:aws:iam::123456789012:role/StudyTeddyDeveloper"
    username = "developer"
    groups   = ["system:authenticated"]
  }
]

# Environment-specific overrides (automatically applied)
environment_config = {
  production = {
    node_instance_types    = ["t3.large", "t3a.large"]
    node_min_size         = 3
    node_max_size         = 20
    node_desired_size     = 3
    db_instance_class     = "db.t3.small"
    redis_node_type       = "cache.t3.small"
    backup_retention_days = 30
    enable_spot_instances = false
    enable_shield         = true
  }
}