
resource "aws_sns_topic" "test" {
  name = "${var.project_name}-test"
  tags = local.tags
}
