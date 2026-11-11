resource "aws_iam_role" "video-processor-role" {
  name = "${var.project_name}-video-processor-role"
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

resource "aws_iam_role_policy_attachment" "video-processor-lambda-basic" {
  role       = aws_iam_role.video-processor-role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "video-processor" {
  function_name = "${var.project_name}-video-processor"
  role          = aws_iam_role.video-processor-role.arn
  handler       = "lambda_placeholder.handler"
  runtime       = "nodejs18.x"
  filename      = var.lambda_placeholder_zip
  tags          = local.tags
}
