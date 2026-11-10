resource "aws_iam_role" "lambda-function-role" {
  name = "${var.project_name}-lambda-function-role"
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

resource "aws_iam_role_policy_attachment" "lambda-function-lambda-basic" {
  role       = aws_iam_role.lambda-function-role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "lambda-function" {
  function_name = "${var.project_name}-lambda-function"
  role          = aws_iam_role.lambda-function-role.arn
  handler       = "lambda_placeholder.handler"
  runtime       = "nodejs18.x"
  filename      = var.lambda_placeholder_zip
  tags          = local.tags
}
