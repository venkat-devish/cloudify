resource "aws_sns_topic_subscription" "sns-topic_to_sqs-queue" {
  topic_arn = aws_sns_topic.sns-topic.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.sqs-queue.arn
}

resource "aws_sqs_queue_policy" "sns-topic_to_sqs-queue_queue_policy" {
  queue_url = aws_sqs_queue.sqs-queue.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowSNSToSend"
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.sqs-queue.arn
      Condition = {
        ArnEquals = {
          "aws:SourceArn" = aws_sns_topic.sns-topic.arn
        }
      }
    }]
  })
}
resource "aws_lambda_event_source_mapping" "sqs-queue_lambda-function" {
  event_source_arn = aws_sqs_queue.sqs-queue.arn
  function_name    = aws_lambda_function.lambda-function.arn
  batch_size       = 10
}

resource "aws_iam_role_policy_attachment" "lambda-function-sqs-consumer" {
  role       = aws_iam_role.lambda-function-role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole"
}
resource "aws_iam_role_policy" "lambda-function-s3-s3-bucket" {
  name = "${var.project_name}-lambda-function-s3-s3-bucket"
  role = aws_iam_role.lambda-function-role.id
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
        aws_s3_bucket.s3-bucket.arn,
        "${aws_s3_bucket.s3-bucket.arn}/*",
      ]
    }]
  })
}
