variable "project_name" {
  type    = string
  default = "videoedit"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "lambda_placeholder_zip" {
  type    = string
  default = "lambda_placeholder.zip"
}
