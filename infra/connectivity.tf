resource "aws_sns_topic_subscription" "test-topic-sns_to_test-image-queue" {
  topic_arn = aws_sns_topic.test-topic-sns.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.test-image-queue.arn
}

resource "aws_sqs_queue_policy" "test-topic-sns_to_test-image-queue_queue_policy" {
  queue_url = aws_sqs_queue.test-image-queue.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowSNSToSend"
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.test-image-queue.arn
      Condition = {
        ArnEquals = {
          "aws:SourceArn" = aws_sns_topic.test-topic-sns.arn
        }
      }
    }]
  })
}
resource "aws_lambda_event_source_mapping" "test-image-queue_test-image-lambda" {
  event_source_arn = aws_sqs_queue.test-image-queue.arn
  function_name    = aws_lambda_function.test-image-lambda.arn
  batch_size       = 10
}

resource "aws_iam_role_policy_attachment" "test-image-lambda-sqs-consumer" {
  role       = aws_iam_role.test-image-lambda-role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole"
}
resource "aws_iam_role_policy" "test-image-lambda-s3-test-image" {
  name = "${var.project_name}-test-image-lambda-s3-test-image"
  role = aws_iam_role.test-image-lambda-role.id
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
        aws_s3_bucket.test-image.arn,
        "${aws_s3_bucket.test-image.arn}/*",
      ]
    }]
  })
}
