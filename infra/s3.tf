resource "aws_s3_bucket" "test-image" {
  bucket = replace(lower("${var.project_name}-test-image-${var.environment}"), "_", "-")
  tags   = local.tags
}

resource "aws_s3_bucket_versioning" "test-image" {
  bucket = aws_s3_bucket.test-image.id
  versioning_configuration {
    status = "Enabled"
  }
}

