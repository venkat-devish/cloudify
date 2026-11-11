resource "aws_sns_topic_subscription" "video-upload-topic_to_video-processing-queue" {
  topic_arn = aws_sns_topic.video-upload-topic.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.video-processing-queue.arn
}

resource "aws_sqs_queue_policy" "video-upload-topic_to_video-processing-queue_queue_policy" {
  queue_url = aws_sqs_queue.video-processing-queue.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowSNSToSend"
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.video-processing-queue.arn
      Condition = {
        ArnEquals = {
          "aws:SourceArn" = aws_sns_topic.video-upload-topic.arn
        }
      }
    }]
  })
}
resource "aws_lambda_event_source_mapping" "video-processing-queue_video-processor" {
  event_source_arn = aws_sqs_queue.video-processing-queue.arn
  function_name    = aws_lambda_function.video-processor.arn
  batch_size       = 10
}

resource "aws_iam_role_policy_attachment" "video-processor-sqs-consumer" {
  role       = aws_iam_role.video-processor-role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole"
}
resource "aws_iam_role_policy" "video-processor-s3-video-storage" {
  name = "${var.project_name}-video-processor-s3-video-storage"
  role = aws_iam_role.video-processor-role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket",
      ]
      Resource = [
        aws_s3_bucket.video-storage.arn,
        "${aws_s3_bucket.video-storage.arn}/*",
      ]
    }]
  })
}
