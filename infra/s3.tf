resource "aws_s3_bucket" "video-storage" {
  bucket = replace(lower("${var.project_name}-video-storage-${var.environment}"), "_", "-")
  tags   = local.tags
}

resource "aws_s3_bucket_versioning" "video-storage" {
  bucket = aws_s3_bucket.video-storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

