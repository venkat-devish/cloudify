
resource "aws_sns_topic" "sdsd" {
  name = "${var.project_name}-sdsd"
  tags = local.tags
}
