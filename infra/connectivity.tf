
resource "aws_sns_topic_subscription" "sns_topic_to_sqs_queue" {
  topic_arn = aws_sns_topic.sns_topic.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.sqs_queue.arn
}

resource "aws_lambda_event_source_mapping" "sqs_queue_lambda_function" {
  event_source_arn = aws_sqs_queue.sqs_queue.arn
  function_name    = aws_lambda_function.lambda_function.arn
  batch_size       = 10
}

resource "aws_iam_role_policy" "lambda_function_s3_s3_bucket" {
  name = "${var.project_name}-lambda_function-s3-s3_bucket"
  role = aws_iam_role.lambda_function_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow" Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
      Resource = [aws_s3_bucket.s3_bucket.arn, "${aws_s3_bucket.s3_bucket.arn}/*"] }]
  })
}
