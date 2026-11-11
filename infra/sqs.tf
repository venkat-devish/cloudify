
resource "aws_sqs_queue" "test-sqs" {
  name                       = "${var.project_name}-test-sqs"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 345600
  tags                       = local.tags
}
