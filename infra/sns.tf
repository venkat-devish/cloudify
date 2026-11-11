
resource "aws_sns_topic" "event-topic" {
  name = "${var.project_name}-event-topic"
  tags = local.tags
}
