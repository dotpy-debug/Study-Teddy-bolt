# Helm Charts for StudyTeddy Infrastructure
# This file contains Helm chart installations for monitoring, ingress, and other services

# Configure Helm provider
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_id, "--region", data.aws_region.current.name]
    }
  }
}

# Configure Kubernetes provider
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_id, "--region", data.aws_region.current.name]
  }
}

# AWS Load Balancer Controller
resource "kubernetes_service_account" "aws_load_balancer_controller" {
  metadata {
    name      = "aws-load-balancer-controller"
    namespace = "kube-system"
    labels = {
      "app.kubernetes.io/name"      = "aws-load-balancer-controller"
      "app.kubernetes.io/component" = "controller"
    }
    annotations = {
      "eks.amazonaws.com/role-arn"               = module.aws_load_balancer_controller_irsa_role.iam_role_arn
      "eks.amazonaws.com/sts-regional-endpoints" = "true"
    }
  }
}

module "aws_load_balancer_controller_irsa_role" {
  source = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"

  role_name                              = "${local.cluster_name}-aws-load-balancer-controller"
  attach_load_balancer_controller_policy = true

  oidc_providers = {
    ex = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-load-balancer-controller"]
    }
  }

  tags = local.common_tags
}

resource "helm_release" "aws_load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "1.7.0"

  values = [
    yamlencode({
      clusterName = module.eks.cluster_id
      serviceAccount = {
        create = false
        name   = "aws-load-balancer-controller"
      }
      region = data.aws_region.current.name
      vpcId  = module.vpc.vpc_id
      image = {
        repository = "602401143452.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/amazon/aws-load-balancer-controller"
      }
    })
  ]

  depends_on = [
    kubernetes_service_account.aws_load_balancer_controller
  ]
}

# NGINX Ingress Controller
resource "helm_release" "nginx_ingress" {
  count = var.enable_nginx_ingress ? 1 : 0

  name       = "nginx-ingress"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "ingress-nginx"
  version    = "4.8.0"

  create_namespace = true

  values = [
    yamlencode({
      controller = {
        service = {
          type = "LoadBalancer"
          annotations = {
            "service.beta.kubernetes.io/aws-load-balancer-type"                              = "nlb"
            "service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled" = "true"
            "service.beta.kubernetes.io/aws-load-balancer-backend-protocol"                  = "tcp"
          }
        }
        metrics = {
          enabled = true
          serviceMonitor = {
            enabled = var.enable_prometheus
          }
        }
        resources = {
          requests = {
            cpu    = "100m"
            memory = "90Mi"
          }
          limits = {
            cpu    = "200m"
            memory = "200Mi"
          }
        }
        autoscaling = {
          enabled     = true
          minReplicas = var.environment == "production" ? 3 : 1
          maxReplicas = var.environment == "production" ? 10 : 3
          targetCPUUtilizationPercentage = 80
        }
        config = {
          "use-forwarded-headers" = "true"
          "compute-full-forwarded-for" = "true"
          "use-proxy-protocol" = "false"
          "server-tokens" = "false"
          "ssl-protocols" = "TLSv1.2 TLSv1.3"
          "ssl-ciphers" = "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384"
        }
      }
      defaultBackend = {
        enabled = true
      }
    })
  ]
}

# cert-manager for SSL certificate management
resource "helm_release" "cert_manager" {
  count = var.enable_cert_manager ? 1 : 0

  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  namespace  = "cert-manager"
  version    = "v1.13.0"

  create_namespace = true

  set {
    name  = "installCRDs"
    value = "true"
  }

  values = [
    yamlencode({
      global = {
        leaderElection = {
          namespace = "cert-manager"
        }
      }
      serviceAccount = {
        annotations = {
          "eks.amazonaws.com/role-arn" = module.cert_manager_irsa_role[0].iam_role_arn
        }
      }
      securityContext = {
        fsGroup = 1001
      }
      resources = {
        requests = {
          cpu    = "10m"
          memory = "32Mi"
        }
        limits = {
          cpu    = "100m"
          memory = "128Mi"
        }
      }
    })
  ]
}

module "cert_manager_irsa_role" {
  count  = var.enable_cert_manager ? 1 : 0
  source = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"

  role_name                     = "${local.cluster_name}-cert-manager"
  attach_cert_manager_policy    = true
  cert_manager_hosted_zone_arns = var.hosted_zone_id != "" ? ["arn:aws:route53:::hostedzone/${var.hosted_zone_id}"] : []

  oidc_providers = {
    ex = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["cert-manager:cert-manager"]
    }
  }

  tags = local.common_tags
}

# ClusterIssuer for Let's Encrypt
resource "kubernetes_manifest" "letsencrypt_prod" {
  count = var.enable_cert_manager && var.hosted_zone_id != "" ? 1 : 0

  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata = {
      name = "letsencrypt-prod"
    }
    spec = {
      acme = {
        server = "https://acme-v02.api.letsencrypt.org/directory"
        email  = var.alert_email != "" ? var.alert_email : "admin@${var.domain_name}"
        privateKeySecretRef = {
          name = "letsencrypt-prod"
        }
        solvers = [
          {
            dns01 = {
              route53 = {
                region       = data.aws_region.current.name
                hostedZoneID = var.hosted_zone_id
              }
            }
          }
        ]
      }
    }
  }

  depends_on = [helm_release.cert_manager]
}

# External Secrets Operator
resource "helm_release" "external_secrets" {
  count = var.enable_external_secrets ? 1 : 0

  name       = "external-secrets"
  repository = "https://charts.external-secrets.io"
  chart      = "external-secrets"
  namespace  = "external-secrets-system"
  version    = "0.9.0"

  create_namespace = true

  values = [
    yamlencode({
      installCRDs = true
      resources = {
        requests = {
          cpu    = "10m"
          memory = "32Mi"
        }
        limits = {
          cpu    = "100m"
          memory = "128Mi"
        }
      }
      webhook = {
        resources = {
          requests = {
            cpu    = "10m"
            memory = "32Mi"
          }
          limits = {
            cpu    = "100m"
            memory = "128Mi"
          }
        }
      }
      certController = {
        resources = {
          requests = {
            cpu    = "10m"
            memory = "32Mi"
          }
          limits = {
            cpu    = "100m"
            memory = "128Mi"
          }
        }
      }
    })
  ]
}

# Cluster Autoscaler
resource "helm_release" "cluster_autoscaler" {
  count = var.enable_cluster_autoscaler ? 1 : 0

  name       = "cluster-autoscaler"
  repository = "https://kubernetes.github.io/autoscaler"
  chart      = "cluster-autoscaler"
  namespace  = "kube-system"
  version    = "9.29.0"

  values = [
    yamlencode({
      autoDiscovery = {
        clusterName = module.eks.cluster_id
        enabled     = true
      }
      awsRegion = data.aws_region.current.name
      image = {
        repository = "registry.k8s.io/autoscaling/cluster-autoscaler"
        tag        = "v1.28.2"
      }
      resources = {
        requests = {
          cpu    = "100m"
          memory = "128Mi"
        }
        limits = {
          cpu    = "200m"
          memory = "256Mi"
        }
      }
      rbac = {
        serviceAccount = {
          annotations = {
            "eks.amazonaws.com/role-arn" = module.cluster_autoscaler_irsa_role[0].iam_role_arn
          }
        }
      }
      extraArgs = {
        scale-down-delay-after-add       = "10m"
        scale-down-unneeded-time         = "10m"
        scale-down-delay-after-delete    = "10s"
        scale-down-delay-after-failure   = "3m"
        scale-down-utilization-threshold = "0.5"
        skip-nodes-with-local-storage    = false
        skip-nodes-with-system-pods      = false
      }
    })
  ]
}

module "cluster_autoscaler_irsa_role" {
  count  = var.enable_cluster_autoscaler ? 1 : 0
  source = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"

  role_name                        = "${local.cluster_name}-cluster-autoscaler"
  attach_cluster_autoscaler_policy = true
  cluster_autoscaler_cluster_ids   = [module.eks.cluster_id]

  oidc_providers = {
    ex = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:cluster-autoscaler"]
    }
  }

  tags = local.common_tags
}

# Prometheus & Grafana Stack
resource "helm_release" "kube_prometheus_stack" {
  count = var.enable_prometheus ? 1 : 0

  name       = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = "monitoring"
  version    = "51.0.0"

  create_namespace = true

  values = [
    yamlencode({
      prometheus = {
        prometheusSpec = {
          storageSpec = {
            volumeClaimTemplate = {
              spec = {
                storageClassName = "gp3"
                accessModes      = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = var.environment == "production" ? "50Gi" : "20Gi"
                  }
                }
              }
            }
          }
          retention = var.environment == "production" ? "30d" : "15d"
          resources = {
            requests = {
              cpu    = "200m"
              memory = "2Gi"
            }
            limits = {
              cpu    = "1000m"
              memory = "4Gi"
            }
          }
          serviceMonitorSelectorNilUsesHelmValues = false
          podMonitorSelectorNilUsesHelmValues     = false
          ruleSelectorNilUsesHelmValues           = false
        }
        service = {
          type = "ClusterIP"
        }
        ingress = {
          enabled = var.enable_nginx_ingress
          annotations = {
            "kubernetes.io/ingress.class"                 = "nginx"
            "cert-manager.io/cluster-issuer"             = "letsencrypt-prod"
            "nginx.ingress.kubernetes.io/auth-type"      = "basic"
            "nginx.ingress.kubernetes.io/auth-secret"    = "monitoring/prometheus-auth"
            "nginx.ingress.kubernetes.io/auth-realm"     = "Authentication Required"
          }
          hosts = [
            {
              host = "prometheus.${var.domain_name}"
              paths = [
                {
                  path     = "/"
                  pathType = "Prefix"
                }
              ]
            }
          ]
          tls = [
            {
              secretName = "prometheus-tls"
              hosts      = ["prometheus.${var.domain_name}"]
            }
          ]
        }
      }
      grafana = {
        enabled = var.enable_grafana
        adminPassword = "StudyTeddy123!"
        persistence = {
          enabled          = true
          storageClassName = "gp3"
          size             = "10Gi"
        }
        resources = {
          requests = {
            cpu    = "100m"
            memory = "256Mi"
          }
          limits = {
            cpu    = "500m"
            memory = "1Gi"
          }
        }
        ingress = {
          enabled = var.enable_nginx_ingress
          annotations = {
            "kubernetes.io/ingress.class"   = "nginx"
            "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
          }
          hosts = [
            {
              host = "grafana.${var.domain_name}"
              paths = [
                {
                  path     = "/"
                  pathType = "Prefix"
                }
              ]
            }
          ]
          tls = [
            {
              secretName = "grafana-tls"
              hosts      = ["grafana.${var.domain_name}"]
            }
          ]
        }
        sidecar = {
          dashboards = {
            enabled = true
            searchNamespace = "ALL"
          }
          datasources = {
            enabled = true
            searchNamespace = "ALL"
          }
        }
        dashboardProviders = {
          "dashboardproviders.yaml" = {
            apiVersion = 1
            providers = [
              {
                name            = "default"
                orgId           = 1
                folder          = ""
                type            = "file"
                disableDeletion = false
                editable        = true
                options = {
                  path = "/var/lib/grafana/dashboards/default"
                }
              }
            ]
          }
        }
      }
      alertmanager = {
        alertmanagerSpec = {
          storage = {
            volumeClaimTemplate = {
              spec = {
                storageClassName = "gp3"
                accessModes      = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = "10Gi"
                  }
                }
              }
            }
          }
          resources = {
            requests = {
              cpu    = "50m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "200m"
              memory = "256Mi"
            }
          }
        }
        config = {
          global = {
            slack_api_url = var.slack_webhook_url
          }
          route = {
            group_by        = ["alertname"]
            group_wait      = "10s"
            group_interval  = "10s"
            repeat_interval = "1h"
            receiver        = "web.hook"
          }
          receivers = [
            {
              name = "web.hook"
              slack_configs = var.slack_webhook_url != "" ? [
                {
                  channel    = "#alerts"
                  title      = "StudyTeddy Alert"
                  text       = "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"
                  send_resolved = true
                }
              ] : []
            }
          ]
        }
      }
      kubeStateMetrics = {
        enabled = true
      }
      nodeExporter = {
        enabled = true
      }
      prometheusOperator = {
        resources = {
          requests = {
            cpu    = "50m"
            memory = "128Mi"
          }
          limits = {
            cpu    = "200m"
            memory = "256Mi"
          }
        }
      }
    })
  ]

  timeout = 1200
}

# Metrics Server (for HPA)
resource "helm_release" "metrics_server" {
  count = var.enable_horizontal_pod_autoscaler ? 1 : 0

  name       = "metrics-server"
  repository = "https://kubernetes-sigs.github.io/metrics-server/"
  chart      = "metrics-server"
  namespace  = "kube-system"
  version    = "3.11.0"

  values = [
    yamlencode({
      args = [
        "--cert-dir=/tmp",
        "--secure-port=4443",
        "--kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname",
        "--kubelet-use-node-status-port",
        "--metric-resolution=15s"
      ]
      resources = {
        requests = {
          cpu    = "100m"
          memory = "200Mi"
        }
        limits = {
          cpu    = "200m"
          memory = "400Mi"
        }
      }
    })
  ]
}

# Fluentd for log aggregation
resource "helm_release" "fluentd" {
  count = var.enable_fluentd ? 1 : 0

  name       = "fluentd"
  repository = "https://fluent.github.io/helm-charts"
  chart      = "fluentd"
  namespace  = "logging"
  version    = "0.4.0"

  create_namespace = true

  values = [
    yamlencode({
      image = {
        repository = "fluent/fluentd-kubernetes-daemonset"
        tag        = "v1.16-debian-cloudwatch-1"
      }
      env = [
        {
          name  = "AWS_REGION"
          value = data.aws_region.current.name
        },
        {
          name  = "CLUSTER_NAME"
          value = module.eks.cluster_id
        }
      ]
      resources = {
        requests = {
          cpu    = "100m"
          memory = "200Mi"
        }
        limits = {
          cpu    = "500m"
          memory = "500Mi"
        }
      }
      serviceAccount = {
        annotations = {
          "eks.amazonaws.com/role-arn" = module.fluentd_irsa_role[0].iam_role_arn
        }
      }
    })
  ]
}

module "fluentd_irsa_role" {
  count  = var.enable_fluentd ? 1 : 0
  source = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"

  role_name = "${local.cluster_name}-fluentd"

  role_policy_arns = {
    cloudwatch = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
  }

  oidc_providers = {
    ex = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["logging:fluentd"]
    }
  }

  tags = local.common_tags
}