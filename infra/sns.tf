
resource "aws_sns_topic" "sns-topic" {
  name = "${var.project_name}-sns-topic"
  tags = local.tags
}
