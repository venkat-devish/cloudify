export type AwsResourceType =
  | "aws_sns_topic"
  | "aws_sqs_queue"
  | "aws_lambda_function"
  | "aws_s3_bucket"
  | "aws_dynamodb_table"
  | "aws_apigatewayv2_api"
  | "aws_lb"
  | "aws_db_instance"
  | "aws_cloudfront_distribution"
  | "aws_cognito_user_pool"
  | "external_client";

export type EdgeKind =
  | "sns_to_sqs"
  | "sqs_to_lambda"
  | "lambda_to_s3"
  | "api_to_lambda"
  | "alb_to_lambda"
  | "lambda_to_dynamodb"
  | "cloudfront_to_alb"
  | "client_to_sns"
  | "client_to_api"
  | "generic";

export interface TopologyNode {
  id: string;
  type: AwsResourceType;
  name: string;
  config?: Record<string, string | number | boolean>;
  positionX?: number;
  positionY?: number;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
}

export interface Topology {
  projectName: string;
  terraformCoreVersion: string;
  awsProviderVersion: string;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface Suggestion {
  severity: string;
  code: string;
  message: string;
  resourceId?: string;
  docUrl?: string;
}

export interface DocReference {
  resourceType: string;
  providerVersion: string;
  title: string;
  url: string;
  category?: string;
}

export interface ResourceValidation {
  nodeId: string;
  name: string;
  type: string;
  status: string;
}

export interface TerraformPlanResult {
  success: boolean;
  initOutput: string;
  validateOutput: string;
  planOutput: string;
  applyOutput?: string;
  applied: boolean;
}

export interface MonitoringAlert {
  severity: string;
  code: string;
  title: string;
  message: string;
  resourceId?: string;
}

export interface AdvisorRecommendation {
  category: string;
  priority: string;
  title: string;
  message: string;
  resourceId?: string;
}

export interface BillingLineItem {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  monthlyUsd: number;
  note: string;
}

export interface OnCallAlert {
  severity: string;
  status: string;
  code: string;
  title: string;
  message: string;
  resourceName: string;
  logGroup: string;
  metricSummary: string;
  detectedAt: string;
}

export interface TopologyInsights {
  onCallAlerts?: OnCallAlert[];
  monitoringAlerts: MonitoringAlert[];
  recommendations: AdvisorRecommendation[];
  billingLines: BillingLineItem[];
  estimatedMonthlyUsd: number;
  billingDisclaimer: string;
}
