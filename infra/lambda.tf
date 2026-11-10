resource "aws_iam_role" "lambda_function_role" {
  name = "${var.project_name}-lambda_function-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "lambda_function_lambda_basic" {
  role       = aws_iam_role.lambda_function_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "lambda_function" {
  function_name = "${var.project_name}-lambda_function"
  role          = aws_iam_role.lambda_function_role.arn
  handler       = "lambda_placeholder.handler"
  runtime       = "nodejs18.x"
  filename      = var.lambda_placeholder_zip
  tags          = local.tags
}

resource "aws_cloudwatch_log_group" "lambda_function_logs" {
  name              = "/aws/lambda/${var.project_name}-lambda_function"
  retention_in_days = 90
  tags              = local.tags
}
