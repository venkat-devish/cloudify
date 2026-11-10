
resource "aws_sqs_queue" "sqs-queue" {
  name                       = "${var.project_name}-sqs-queue"
  visibility_timeout_seconds = 60
  tags                       = local.tags
}
