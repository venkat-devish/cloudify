
resource "aws_sns_topic" "video-upload-topic" {
  name = "${var.project_name}-video-upload-topic"
  tags = local.tags
}
