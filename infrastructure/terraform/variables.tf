# Variables for StudyTeddy Infrastructure

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "studyteddy"
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# EKS Configuration
variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "node_instance_types" {
  description = "EC2 instance types for EKS nodes"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_min_size" {
  description = "Minimum number of nodes"
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum number of nodes"
  type        = number
  default     = 10
}

variable "node_desired_size" {
  description = "Desired number of nodes"
  type        = number
  default     = 2
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Initial allocated storage for RDS"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS auto-scaling"
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "studyteddy"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "studyteddy"
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1
}

# Domain Configuration
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "studyteddy.com"
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
  default     = ""
}

# SSL Certificate
variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate in ACM"
  type        = string
  default     = ""
}

# Monitoring
variable "enable_monitoring" {
  description = "Enable enhanced monitoring"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable application logging"
  type        = bool
  default     = true
}

# Backup Configuration
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = false
}

# Security
variable "enable_waf" {
  description = "Enable AWS WAF"
  type        = bool
  default     = true
}

variable "enable_shield" {
  description = "Enable AWS Shield Advanced"
  type        = bool
  default     = false
}

# Auto Scaling
variable "enable_cluster_autoscaler" {
  description = "Enable cluster autoscaler"
  type        = bool
  default     = true
}

variable "enable_horizontal_pod_autoscaler" {
  description = "Enable horizontal pod autoscaler"
  type        = bool
  default     = true
}

variable "enable_vertical_pod_autoscaler" {
  description = "Enable vertical pod autoscaler"
  type        = bool
  default     = false
}

# AWS Auth Users
variable "aws_auth_users" {
  description = "List of users to add to aws-auth configmap"
  type = list(object({
    userarn  = string
    username = string
    groups   = list(string)
  }))
  default = []
}

# AWS Auth Roles
variable "aws_auth_roles" {
  description = "List of roles to add to aws-auth configmap"
  type = list(object({
    rolearn  = string
    username = string
    groups   = list(string)
  }))
  default = []
}

# Feature Flags
variable "enable_istio" {
  description = "Enable Istio service mesh"
  type        = bool
  default     = false
}

variable "enable_external_secrets" {
  description = "Enable External Secrets Operator"
  type        = bool
  default     = true
}

variable "enable_cert_manager" {
  description = "Enable cert-manager for automatic SSL certificate management"
  type        = bool
  default     = true
}

variable "enable_nginx_ingress" {
  description = "Enable NGINX Ingress Controller"
  type        = bool
  default     = true
}

variable "enable_prometheus" {
  description = "Enable Prometheus monitoring stack"
  type        = bool
  default     = true
}

variable "enable_grafana" {
  description = "Enable Grafana dashboards"
  type        = bool
  default     = true
}

variable "enable_jaeger" {
  description = "Enable Jaeger distributed tracing"
  type        = bool
  default     = false
}

variable "enable_fluentd" {
  description = "Enable Fluentd for log aggregation"
  type        = bool
  default     = true
}

# Application Configuration
variable "app_replicas" {
  description = "Number of application replicas"
  type        = number
  default     = 2
}

variable "app_cpu_request" {
  description = "CPU request for application pods"
  type        = string
  default     = "100m"
}

variable "app_memory_request" {
  description = "Memory request for application pods"
  type        = string
  default     = "256Mi"
}

variable "app_cpu_limit" {
  description = "CPU limit for application pods"
  type        = string
  default     = "500m"
}

variable "app_memory_limit" {
  description = "Memory limit for application pods"
  type        = string
  default     = "1Gi"
}

# Environment-specific overrides
variable "environment_config" {
  description = "Environment-specific configuration overrides"
  type = object({
    production = optional(object({
      node_instance_types   = optional(list(string))
      node_min_size        = optional(number)
      node_max_size        = optional(number)
      node_desired_size    = optional(number)
      db_instance_class    = optional(string)
      redis_node_type      = optional(string)
      backup_retention_days = optional(number)
      enable_spot_instances = optional(bool)
      enable_shield        = optional(bool)
    }))
    staging = optional(object({
      node_instance_types   = optional(list(string))
      node_min_size        = optional(number)
      node_max_size        = optional(number)
      node_desired_size    = optional(number)
      db_instance_class    = optional(string)
      redis_node_type      = optional(string)
      backup_retention_days = optional(number)
      enable_spot_instances = optional(bool)
    }))
    development = optional(object({
      node_instance_types   = optional(list(string))
      node_min_size        = optional(number)
      node_max_size        = optional(number)
      node_desired_size    = optional(number)
      db_instance_class    = optional(string)
      redis_node_type      = optional(string)
      backup_retention_days = optional(number)
      enable_spot_instances = optional(bool)
    }))
  })
  default = {
    production = {
      node_instance_types   = ["t3.large", "t3a.large"]
      node_min_size        = 3
      node_max_size        = 20
      node_desired_size    = 3
      db_instance_class    = "db.t3.small"
      redis_node_type      = "cache.t3.small"
      backup_retention_days = 30
      enable_spot_instances = false
      enable_shield        = true
    }
    staging = {
      node_instance_types   = ["t3.medium"]
      node_min_size        = 1
      node_max_size        = 5
      node_desired_size    = 2
      db_instance_class    = "db.t3.micro"
      redis_node_type      = "cache.t3.micro"
      backup_retention_days = 7
      enable_spot_instances = true
    }
    development = {
      node_instance_types   = ["t3.small"]
      node_min_size        = 1
      node_max_size        = 3
      node_desired_size    = 1
      db_instance_class    = "db.t3.micro"
      redis_node_type      = "cache.t3.micro"
      backup_retention_days = 3
      enable_spot_instances = true
    }
  }
}

# Notification Configuration
variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  default     = ""
  sensitive   = true
}

variable "discord_webhook_url" {
  description = "Discord webhook URL for notifications"
  type        = string
  default     = ""
  sensitive   = true
}

variable "alert_email" {
  description = "Email address for critical alerts"
  type        = string
  default     = ""
}

# Compliance and Governance
variable "enable_aws_config" {
  description = "Enable AWS Config for compliance monitoring"
  type        = bool
  default     = true
}

variable "enable_cloudtrail" {
  description = "Enable CloudTrail for audit logging"
  type        = bool
  default     = true
}

variable "enable_guardduty" {
  description = "Enable GuardDuty for threat detection"
  type        = bool
  default     = true
}

variable "enable_security_hub" {
  description = "Enable Security Hub for security findings"
  type        = bool
  default     = true
}

# Data Retention
variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
}

variable "metrics_retention_days" {
  description = "Number of days to retain CloudWatch metrics"
  type        = number
  default     = 30
}

# Disaster Recovery
variable "enable_cross_region_backup" {
  description = "Enable cross-region backup for disaster recovery"
  type        = bool
  default     = false
}

variable "backup_region" {
  description = "AWS region for cross-region backups"
  type        = string
  default     = "us-west-2"
}

# Performance
variable "enable_enhanced_networking" {
  description = "Enable enhanced networking for EC2 instances"
  type        = bool
  default     = true
}

variable "enable_placement_groups" {
  description = "Enable placement groups for better network performance"
  type        = bool
  default     = false
}

# Local values for environment-specific configurations
locals {
  env_config = var.environment_config[var.environment]

  # Apply environment-specific overrides
  final_node_instance_types   = local.env_config.node_instance_types != null ? local.env_config.node_instance_types : var.node_instance_types
  final_node_min_size        = local.env_config.node_min_size != null ? local.env_config.node_min_size : var.node_min_size
  final_node_max_size        = local.env_config.node_max_size != null ? local.env_config.node_max_size : var.node_max_size
  final_node_desired_size    = local.env_config.node_desired_size != null ? local.env_config.node_desired_size : var.node_desired_size
  final_db_instance_class    = local.env_config.db_instance_class != null ? local.env_config.db_instance_class : var.db_instance_class
  final_redis_node_type      = local.env_config.redis_node_type != null ? local.env_config.redis_node_type : var.redis_node_type
  final_backup_retention_days = local.env_config.backup_retention_days != null ? local.env_config.backup_retention_days : var.backup_retention_days
  final_enable_spot_instances = local.env_config.enable_spot_instances != null ? local.env_config.enable_spot_instances : var.enable_spot_instances
  final_enable_shield        = try(local.env_config.enable_shield, var.enable_shield)
}