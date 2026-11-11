
resource "aws_sqs_queue" "video-processing-queue" {
  name                       = "${var.project_name}-video-processing-queue"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 345600
  tags                       = local.tags
}
