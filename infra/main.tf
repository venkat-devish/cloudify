locals {
  tags = {
    ManagedBy   = "Terraform"
    GeneratedBy = "Cloudify"
    Environment = var.environment
    Service     = var.project_name
  }
}
