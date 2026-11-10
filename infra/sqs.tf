
resource "aws_sqs_queue" "sqs_queue" {
  name                       = "${var.project_name}-sqs_queue"
  visibility_timeout_seconds = 60
  tags                       = local.tags
}
