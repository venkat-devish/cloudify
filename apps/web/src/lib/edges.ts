import type { AwsResourceType, EdgeKind } from "./types";

export type DiagramResourceType = AwsResourceType;

const PAIRS: [DiagramResourceType, DiagramResourceType, EdgeKind][] = [
  ["external_client", "aws_sns_topic", "client_to_sns"],
  ["external_client", "aws_apigatewayv2_api", "client_to_api"],
  ["aws_sns_topic", "aws_sqs_queue", "sns_to_sqs"],
  ["aws_sqs_queue", "aws_lambda_function", "sqs_to_lambda"],
  ["aws_lambda_function", "aws_s3_bucket", "lambda_to_s3"],
  ["aws_apigatewayv2_api", "aws_lambda_function", "api_to_lambda"],
  ["aws_lb", "aws_lambda_function", "alb_to_lambda"],
  ["aws_lambda_function", "aws_dynamodb_table", "lambda_to_dynamodb"],
  ["aws_cloudfront_distribution", "aws_lb", "cloudfront_to_alb"],
];

export function inferEdgeKind(sourceType: DiagramResourceType, targetType: DiagramResourceType): EdgeKind {
  for (const [s, t, k] of PAIRS) {
    if (s === sourceType && t === targetType) return k;
  }
  return "generic";
}

export function isSupportedConnection(sourceType: DiagramResourceType, targetType: DiagramResourceType): boolean {
  for (const [s, t] of PAIRS) {
    if (s === sourceType && t === targetType) return true;
  }
  return false;
}

/** React Flow source/target follow drag direction; swap when user connects in→out backwards. */
export function normalizeConnection(
  sourceId: string,
  targetId: string,
  sourceType: DiagramResourceType,
  targetType: DiagramResourceType,
): { source: string; target: string; kind: EdgeKind } | null {
  if (isSupportedConnection(sourceType, targetType)) {
    return { source: sourceId, target: targetId, kind: inferEdgeKind(sourceType, targetType) };
  }
  if (isSupportedConnection(targetType, sourceType)) {
    return { source: targetId, target: sourceId, kind: inferEdgeKind(targetType, sourceType) };
  }
  return null;
}

export const CONNECTION_HINT = "Connect: right dot → left dot.";

export function connectionErrorMessage(sourceType: DiagramResourceType, targetType: DiagramResourceType): string {
  const label = (t: DiagramResourceType) => t.replace(/^aws_/, "").replace(/_/g, " ");
  return `Can't link ${label(sourceType)} to ${label(targetType)}. Pick a supported pair (e.g. SNS to SQS, SQS to Lambda, API to Lambda, Lambda to S3 or DynamoDB).`;
}
