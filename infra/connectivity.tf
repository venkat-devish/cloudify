resource "aws_sns_topic_subscription" "sns-test-topic_to_test-sqs" {
  topic_arn = aws_sns_topic.sns-test-topic.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.test-sqs.arn
}

resource "aws_sqs_queue_policy" "sns-test-topic_to_test-sqs_queue_policy" {
  queue_url = aws_sqs_queue.test-sqs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowSNSToSend"
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.test-sqs.arn
      Condition = {
        ArnEquals = {
          "aws:SourceArn" = aws_sns_topic.sns-test-topic.arn
        }
      }
    }]
  })
}
resource "aws_lambda_event_source_mapping" "test-sqs_image-lambda" {
  event_source_arn = aws_sqs_queue.test-sqs.arn
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
