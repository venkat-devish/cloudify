
resource "aws_sns_topic" "sns_topic" {
  name = "${var.project_name}-sns_topic"
  tags = local.tags
}
