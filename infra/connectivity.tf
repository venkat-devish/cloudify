resource "aws_sns_topic_subscription" "event-topic_to_test-queue" {
  topic_arn = aws_sns_topic.event-topic.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.test-queue.arn
}

resource "aws_sqs_queue_policy" "event-topic_to_test-queue_queue_policy" {
  queue_url = aws_sqs_queue.test-queue.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowSNSToSend"
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.test-queue.arn
      Condition = {
        ArnEquals = {
          "aws:SourceArn" = aws_sns_topic.event-topic.arn
        }
      }
    }]
  })
}
resource "aws_lambda_event_source_mapping" "test-queue_image-lambda" {
  event_source_arn = aws_sqs_queue.test-queue.arn
  function_name    = aws_lambda_function.image-lambda.arn
  batch_size       = 10
}

resource "aws_iam_role_policy_attachment" "image-lambda-sqs-consumer" {
  role       = aws_iam_role.image-lambda-role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole"
}
resource "aws_iam_role_policy" "image-lambda-s3-image-storage" {
  name = "${var.project_name}-image-lambda-s3-image-storage"
  role = aws_iam_role.image-lambda-role.id
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
        aws_s3_bucket.image-storage.arn,
        "${aws_s3_bucket.image-storage.arn}/*",
      ]
    }]
  })
}
