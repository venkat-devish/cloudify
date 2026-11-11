
resource "aws_sns_topic" "test-topic-sns" {
  name = "${var.project_name}-test-topic-sns"
  tags = local.tags
}
