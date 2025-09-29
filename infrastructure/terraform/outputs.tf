# Outputs for StudyTeddy Infrastructure

# Cluster Information
output "cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks.cluster_arn
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "cluster_iam_role_name" {
  description = "IAM role name associated with EKS cluster"
  value       = module.eks.cluster_iam_role_name
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN associated with EKS cluster"
  value       = module.eks.cluster_iam_role_arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "cluster_primary_security_group_id" {
  description = "Cluster security group that was created by Amazon EKS for the cluster"
  value       = module.eks.cluster_primary_security_group_id
}

output "cluster_service_cidr" {
  description = "The CIDR block where Kubernetes pod and service IP addresses are assigned from"
  value       = module.eks.cluster_service_cidr
}

output "cluster_ip_family" {
  description = "The IP family used to assign Kubernetes pod and service addresses"
  value       = module.eks.cluster_ip_family
}

# OIDC Provider
output "oidc_provider_arn" {
  description = "The ARN of the OIDC Provider if enabled"
  value       = module.eks.oidc_provider_arn
}

output "oidc_provider" {
  description = "The OpenID Connect identity provider (issuer URL without leading `https://`)"
  value       = module.eks.oidc_provider
}

# Node Groups
output "eks_managed_node_groups" {
  description = "Map of attribute maps for all EKS managed node groups created"
  value       = module.eks.eks_managed_node_groups
}

output "eks_managed_node_groups_autoscaling_group_names" {
  description = "List of the autoscaling group names created by EKS managed node groups"
  value       = module.eks.eks_managed_node_groups_autoscaling_group_names
}

# VPC Information
output "vpc_id" {
  description = "ID of the VPC where the cluster and its nodes will be provisioned"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "database_subnets" {
  description = "List of IDs of database subnets"
  value       = module.vpc.database_subnets
}

output "database_subnet_group" {
  description = "ID of database subnet group"
  value       = module.vpc.database_subnet_group
}

output "nat_gateway_ids" {
  description = "List of IDs of the NAT Gateways"
  value       = module.vpc.natgw_ids
}

output "nat_public_ips" {
  description = "List of public Elastic IPs created for AWS NAT Gateway"
  value       = module.vpc.nat_public_ips
}

output "internet_gateway_id" {
  description = "The ID of the Internet Gateway"
  value       = module.vpc.igw_id
}

# Database Information
output "db_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.main.id
}

output "db_instance_name" {
  description = "RDS instance name"
  value       = aws_db_instance.main.db_name
}

output "db_instance_username" {
  description = "RDS instance root username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "db_instance_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "db_instance_availability_zone" {
  description = "RDS instance availability zone"
  value       = aws_db_instance.main.availability_zone
}

output "db_parameter_group_id" {
  description = "RDS instance parameter group id"
  value       = aws_db_parameter_group.main.id
}

output "db_security_group_id" {
  description = "RDS instance security group id"
  value       = aws_security_group.rds.id
}

# ElastiCache Information
output "elasticache_replication_group_id" {
  description = "ElastiCache replication group identifier"
  value       = aws_elasticache_replication_group.main.id
}

output "elasticache_primary_endpoint_address" {
  description = "Address of the endpoint for the primary node in the replication group"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "elasticache_reader_endpoint_address" {
  description = "Address of the endpoint for the reader node in the replication group"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "elasticache_port" {
  description = "ElastiCache port"
  value       = aws_elasticache_replication_group.main.port
}

output "elasticache_parameter_group_id" {
  description = "ElastiCache parameter group id"
  value       = aws_elasticache_parameter_group.main.id
}

output "elasticache_security_group_id" {
  description = "ElastiCache security group id"
  value       = aws_security_group.elasticache.id
}

# Load Balancer Information
output "load_balancer_arn" {
  description = "The ARN of the load balancer"
  value       = aws_lb.main.arn
}

output "load_balancer_dns_name" {
  description = "The DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "load_balancer_zone_id" {
  description = "The canonical hosted zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "load_balancer_security_group_id" {
  description = "Load balancer security group ID"
  value       = aws_security_group.alb.id
}

# S3 Buckets
output "s3_bucket_app_data_id" {
  description = "The name of the app data S3 bucket"
  value       = aws_s3_bucket.app_data.id
}

output "s3_bucket_app_data_arn" {
  description = "The ARN of the app data S3 bucket"
  value       = aws_s3_bucket.app_data.arn
}

output "s3_bucket_alb_logs_id" {
  description = "The name of the ALB logs S3 bucket"
  value       = aws_s3_bucket.alb_logs.id
}

output "s3_bucket_alb_logs_arn" {
  description = "The ARN of the ALB logs S3 bucket"
  value       = aws_s3_bucket.alb_logs.arn
}

# Secrets Manager
output "secret_db_password_arn" {
  description = "The ARN of the database password secret"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "secret_db_password_name" {
  description = "The name of the database password secret"
  value       = aws_secretsmanager_secret.db_password.name
}

# KMS
output "kms_key_id" {
  description = "The globally unique identifier for the key"
  value       = aws_kms_key.app.key_id
}

output "kms_key_arn" {
  description = "The Amazon Resource Name (ARN) of the key"
  value       = aws_kms_key.app.arn
}

output "kms_alias_arn" {
  description = "The Amazon Resource Name (ARN) of the key alias"
  value       = aws_kms_alias.app.arn
}

# CloudWatch
output "cloudwatch_log_group_name" {
  description = "Name of CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.app_logs.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.app_logs.arn
}

# Region and Account Information
output "aws_caller_identity_account_id" {
  description = "AWS Account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_caller_identity_arn" {
  description = "AWS Caller Identity ARN"
  value       = data.aws_caller_identity.current.arn
}

output "aws_region_name" {
  description = "AWS region name"
  value       = data.aws_region.current.name
}

output "aws_availability_zones" {
  description = "List of availability zones"
  value       = data.aws_availability_zones.available.names
}

# Configuration for kubectl
output "kubectl_config" {
  description = "kubectl config as generated by the module"
  value = {
    cluster_name                     = module.eks.cluster_id
    endpoint                        = module.eks.cluster_endpoint
    region                          = data.aws_region.current.name
    certificate_authority_data      = module.eks.cluster_certificate_authority_data
  }
  sensitive = true
}

# Connection strings and URLs
output "database_url" {
  description = "Database connection URL"
  value       = "postgresql://${aws_db_instance.main.username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
  sensitive   = true
}

output "redis_url" {
  description = "Redis connection URL"
  value       = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}"
}

# Helm and Kubernetes provider configurations
output "helm_provider_config" {
  description = "Configuration for Helm provider"
  value = {
    kubernetes = {
      host                   = module.eks.cluster_endpoint
      cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
      exec = {
        api_version = "client.authentication.k8s.io/v1beta1"
        command     = "aws"
        args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_id, "--region", data.aws_region.current.name]
      }
    }
  }
  sensitive = true
}

# IAM Roles
output "eks_admin_role_arn" {
  description = "ARN of the EKS admin role"
  value       = aws_iam_role.eks_admin.arn
}

output "ebs_csi_driver_role_arn" {
  description = "ARN of the EBS CSI driver IAM role"
  value       = module.ebs_csi_irsa_role.iam_role_arn
}

# Security Groups
output "eks_additional_security_group_id" {
  description = "EKS additional security group ID"
  value       = aws_security_group.eks_additional.id
}

# Environment and project information
output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "project_name" {
  description = "Project name"
  value       = var.project_name
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = local.cluster_name
}

# Tags
output "common_tags" {
  description = "Common tags applied to all resources"
  value       = local.common_tags
}

# Cost optimization information
output "cost_optimization_features" {
  description = "Enabled cost optimization features"
  value = {
    spot_instances      = var.enable_spot_instances
    single_nat_gateway  = var.environment != "production"
    gp3_storage        = true
    scheduled_scaling  = var.environment != "production"
  }
}

# Monitoring and observability
output "monitoring_endpoints" {
  description = "Monitoring and observability endpoints"
  value = {
    cloudwatch_logs        = "https://${data.aws_region.current.name}.console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#logsV2:log-groups/log-group/${replace(aws_cloudwatch_log_group.app_logs.name, "/", "$252F")}"
    rds_performance_insights = var.environment == "production" ? "https://${data.aws_region.current.name}.console.aws.amazon.com/rds/home?region=${data.aws_region.current.name}#performance-insights-v20206:resourceId=${aws_db_instance.main.resource_id}" : null
  }
}

# Backup and disaster recovery
output "backup_configuration" {
  description = "Backup and disaster recovery configuration"
  value = {
    rds_backup_retention_period = aws_db_instance.main.backup_retention_period
    rds_backup_window          = aws_db_instance.main.backup_window
    elasticache_snapshot_retention = aws_elasticache_replication_group.main.snapshot_retention_limit
    s3_versioning_enabled      = true
  }
}

# Network configuration
output "network_configuration" {
  description = "Network configuration summary"
  value = {
    vpc_cidr            = module.vpc.vpc_cidr_block
    availability_zones  = local.azs
    private_subnet_cidrs = local.private_subnets
    public_subnet_cidrs  = local.public_subnets
    database_subnet_cidrs = local.database_subnets
    nat_gateways        = length(module.vpc.natgw_ids)
  }
}

# Application deployment information
output "deployment_info" {
  description = "Information needed for application deployment"
  value = {
    cluster_name      = module.eks.cluster_id
    cluster_endpoint  = module.eks.cluster_endpoint
    cluster_region    = data.aws_region.current.name
    vpc_id           = module.vpc.vpc_id
    private_subnets  = module.vpc.private_subnets
    public_subnets   = module.vpc.public_subnets
    security_groups = {
      cluster    = module.eks.cluster_security_group_id
      nodes      = module.eks.node_security_group_id
      additional = aws_security_group.eks_additional.id
      alb        = aws_security_group.alb.id
    }
    load_balancer = {
      arn      = aws_lb.main.arn
      dns_name = aws_lb.main.dns_name
      zone_id  = aws_lb.main.zone_id
    }
  }
  sensitive = false
}