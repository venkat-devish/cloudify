
resource "aws_sqs_queue" "test-queue" {
  name                       = "${var.project_name}-test-queue"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 345600
  tags                       = local.tags
}
