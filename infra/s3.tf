
resource "aws_s3_bucket" "s3_bucket" {
  bucket = "${var.project_name}-s3_bucket-${var.environment}"
  tags   = local.tags
}
