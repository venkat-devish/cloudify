import type { AwsResourceType } from "./types";

export interface AwsResourceMeta {
  type: AwsResourceType;
  label: string;
  shortLabel: string;
  category: string;
  brandColor: string;
  iconUrl: string;
}

export const AWS_RESOURCES: AwsResourceMeta[] = [
  { type: "external_client", label: "External Client", shortLabel: "Client", category: "External", brandColor: "#232F3E", iconUrl: "/icons/client.png" },
  { type: "aws_sns_topic", label: "SNS Topic", shortLabel: "SNS", category: "Integration", brandColor: "#E7157B", iconUrl: "/icons/sns.png" },
  { type: "aws_sqs_queue", label: "SQS Queue", shortLabel: "SQS", category: "Integration", brandColor: "#FF4F8B", iconUrl: "/icons/sqs.png" },
  { type: "aws_lambda_function", label: "Lambda Function", shortLabel: "Lambda", category: "Compute", brandColor: "#FF9900", iconUrl: "/icons/lambda.png" },
  { type: "aws_s3_bucket", label: "S3 Bucket", shortLabel: "S3", category: "Storage", brandColor: "#569A31", iconUrl: "/icons/s3.png" },
  { type: "aws_dynamodb_table", label: "DynamoDB", shortLabel: "DynamoDB", category: "Database", brandColor: "#4053D6", iconUrl: "/icons/dynamodb.png" },
  { type: "aws_apigatewayv2_api", label: "API Gateway", shortLabel: "API GW", category: "Networking", brandColor: "#E7157B", iconUrl: "/icons/apigateway.png" },
  { type: "aws_lb", label: "Application Load Balancer", shortLabel: "ALB", category: "Networking", brandColor: "#8C4FFF", iconUrl: "/icons/alb.png" },
  { type: "aws_db_instance", label: "RDS", shortLabel: "RDS", category: "Database", brandColor: "#3B48CC", iconUrl: "/icons/rds.png" },
  { type: "aws_cloudfront_distribution", label: "CloudFront", shortLabel: "CloudFront", category: "Networking", brandColor: "#8C4FFF", iconUrl: "/icons/cloudfront.png" },
  { type: "aws_cognito_user_pool", label: "Cognito", shortLabel: "Cognito", category: "Security", brandColor: "#DD344C", iconUrl: "/icons/cognito.png" },
];

export function metaForType(type: AwsResourceType): AwsResourceMeta | undefined {
  return AWS_RESOURCES.find((r) => r.type === type);
}
