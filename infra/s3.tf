resource "aws_s3_bucket" "s3-bucket" {
  bucket = replace(lower("${var.project_name}-s3-bucket-${var.environment}"), "_", "-")
  tags   = local.tags
}
