import type { Topology } from "./types";

/** Reference event-driven stack shown on the landing page insights panel. */
export const LANDING_SAMPLE_TOPOLOGY: Topology = {
  projectName: "cloudify-demo",
  terraformCoreVersion: "1.5.0",
  awsProviderVersion: "5.0",
  nodes: [
    { id: "n-1", type: "aws_sns_topic", name: "orders-topic" },
    { id: "n-2", type: "aws_sqs_queue", name: "orders-queue" },
    { id: "n-3", type: "aws_lambda_function", name: "process-order", config: { runtime: "nodejs20.x" } },
    { id: "n-4", type: "aws_s3_bucket", name: "order-artifacts" },
    { id: "n-5", type: "aws_apigatewayv2_api", name: "orders-api" },
  ],
  edges: [
    { id: "e-1", source: "n-1", target: "n-2", kind: "sns_to_sqs" },
    { id: "e-2", source: "n-2", target: "n-3", kind: "sqs_to_lambda" },
    { id: "e-3", source: "n-3", target: "n-4", kind: "lambda_to_s3" },
  ],
};
