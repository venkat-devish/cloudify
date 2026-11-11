
resource "aws_sqs_queue" "test-image-queue" {
  name                       = "${var.project_name}-test-image-queue"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 345600
  tags                       = local.tags
}
