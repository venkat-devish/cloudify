resource "aws_s3_bucket" "image-storage" {
  bucket = replace(lower("${var.project_name}-image-storage-${var.environment}"), "_", "-")
  tags   = local.tags
}

resource "aws_s3_bucket_versioning" "image-storage" {
  bucket = aws_s3_bucket.image-storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

