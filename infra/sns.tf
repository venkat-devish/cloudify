
resource "aws_sns_topic" "sns-test-topic" {
  name = "${var.project_name}-sns-test-topic"
  tags = local.tags
}
