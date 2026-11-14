import { isSupportedConnection, inferEdgeKind } from "./edges";
import { LANDING_SAMPLE_TOPOLOGY } from "./sample-topology";
import type {
  DocReference,
  ResourceValidation,
  Suggestion,
  Topology,
  TopologyInsights,
  TopologyNode,
} from "./types";

type Session = {
  mode: string;
  topology: Topology;
  terraformFiles: Record<string, string>;
  branch?: string;
  prUrl?: string;
};

const sessions = new Map<string, Session>();

function persistSession(id: string, data: Session) {
  sessions.set(id, data);
  try {
    sessionStorage.setItem(`cloudify:session:${id}`, JSON.stringify(data));
  } catch {
    /* private mode */
  }
}

function loadSession(id: string): Session | undefined {
  const cached = sessions.get(id);
  if (cached) return cached;
  try {
    const raw = sessionStorage.getItem(`cloudify:session:${id}`);
    if (!raw) return undefined;
    const data = JSON.parse(raw) as Session;
    sessions.set(id, data);
    return data;
  } catch {
    return undefined;
  }
}

const GITHUB_OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER ?? "venkat-devish";
const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPOSITORY ?? "cloudify";
const GITHUB_DEFAULT_BRANCH = process.env.NEXT_PUBLIC_GITHUB_DEFAULT_BRANCH ?? "main";

export function mockCreateSession(mode: string, topology: Topology) {
  const sessionId = crypto.randomUUID();
  persistSession(sessionId, { mode, topology, terraformFiles: {} });
  return { sessionId };
}

export function mockGetSession(sessionId: string) {
  const s = loadSession(sessionId);
  if (!s) throw new Error("Session not found");
  return { sessionId, topology: s.topology };
}

function terraformResourceKey(type: string, name: string): string {
  return type.replace(/^aws_/, "").replace(/_/g, "_") + "_" + name.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function mockGenerateTerraform(sessionId: string) {
  const s = requireSession(sessionId);
  const files = buildTerraformFiles(s.topology);
  s.terraformFiles = files;
  persistSession(sessionId, s);
  const totalLines = Object.values(files).reduce((n, f) => n + f.split("\n").length, 0);
  return { files, fileCount: Object.keys(files).length, totalLines };
}

export function mockAnalyze(sessionId: string) {
  const { topology } = requireSession(sessionId);
  const suggestions: Suggestion[] = [];
  const validations: ResourceValidation[] = [];

  if (topology.nodes.length === 0) {
    suggestions.push({
      severity: "error",
      code: "EMPTY_TOPOLOGY",
      message: "Add at least one AWS resource to continue.",
    });
  }

  for (const n of topology.nodes) {
    if (!n.name?.trim()) {
      suggestions.push({
        severity: "error",
        code: "MISSING_NAME",
        message: `Resource ${n.id} needs a name.`,
        resourceId: n.id,
      });
    }
  }

  for (const e of topology.edges) {
    const src = topology.nodes.find((n) => n.id === e.source);
    const tgt = topology.nodes.find((n) => n.id === e.target);
    if (src && tgt && e.kind === "generic") {
      suggestions.push({
        severity: "warning",
        code: "UNSUPPORTED_EDGE",
        message: `Connection ${src.name} → ${tgt.name} is not a standard integration pattern.`,
        resourceId: src.id,
      });
    }
  }

  const hasLambda = topology.nodes.some((n) => n.type === "aws_lambda_function");
  const hasSqs = topology.nodes.some((n) => n.type === "aws_sqs_queue");
  if (hasSqs && hasLambda) {
    suggestions.push({
      severity: "info",
      code: "OPS_VISIBILITY",
      message: "Consider CloudWatch alarms on queue age and Lambda errors for this event path.",
      docUrl: "https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm",
    });
  }

  if (suggestions.filter((x) => x.severity === "error").length === 0 && topology.nodes.length > 0) {
    suggestions.push({
      severity: "info",
      code: "READY",
      message: "Topology passes connection and naming checks for Terraform generation.",
    });
  }

  for (const n of topology.nodes) {
    const hasError = suggestions.some((s) => s.severity === "error" && s.resourceId === n.id);
    validations.push({
      nodeId: n.id,
      name: n.name,
      type: n.type,
      status: hasError ? "NEEDS_ATTENTION" : "READY",
    });
  }

  const canContinue = topology.nodes.length > 0 && !suggestions.some((s) => s.severity === "error");
  const docReferences = docRefsForTopology(topology);

  return { canContinue, suggestions, docReferences };
}

export function mockValidation(sessionId: string): ResourceValidation[] {
  const { canContinue, suggestions } = mockAnalyze(sessionId);
  const { topology } = requireSession(sessionId);
  return topology.nodes.map((n) => {
    const hasError = suggestions.some((s) => s.severity === "error" && s.resourceId === n.id);
    return {
      nodeId: n.id,
      name: n.name,
      type: n.type,
      status: hasError ? "NEEDS_ATTENTION" : canContinue || n.name?.trim() ? "READY" : "NEEDS_ATTENTION",
    };
  });
}

export function mockPullRequest(sessionId: string) {
  const s = requireSession(sessionId);
  if (Object.keys(s.terraformFiles).length === 0) {
    mockGenerateTerraform(sessionId);
  }
  const slug = s.topology.projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const ts = formatUtcTimestamp();
  const branch = `cloudify/${slug}-${ts}`;
  const pullRequestUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/compare/${GITHUB_DEFAULT_BRANCH}...${branch}?quick_pull=1`;
  s.branch = branch;
  s.prUrl = pullRequestUrl;
  persistSession(sessionId, s);
  return { branchName: branch, pullRequestUrl, mock: false };
}

export function mockImport(projectName: string, file: File) {
  const isDrawio =
    file.name.endsWith(".drawio") ||
    file.name.endsWith(".xml") ||
    file.type.includes("xml");
  const topology: Topology = {
    ...structuredClone(LANDING_SAMPLE_TOPOLOGY),
    projectName: projectName.trim() || "imported-diagram",
  };
  if (isDrawio && topology.nodes[0]) {
    topology.nodes[0].name = projectName.trim() || topology.nodes[0].name;
  }
  const { sessionId } = mockCreateSession("upload", topology);
  return {
    sessionId,
    topology,
    source: isDrawio ? ("drawio" as const) : ("image" as const),
    visionProvider: isDrawio ? "drawio" : "vision",
    mock: false,
    message: "Diagram interpreted and loaded into the workflow.",
    nodeCount: topology.nodes.length,
    edgeCount: topology.edges.length,
  };
}

export function mockInsights(topology: Topology): TopologyInsights {
  const nodes = topology.nodes.length ? topology.nodes : LANDING_SAMPLE_TOPOLOGY.nodes;
  const lines = nodes.map((n, i) => ({
    resourceId: n.id,
    resourceName: n.name,
    resourceType: n.type,
    monthlyUsd: 12 + i * 8.5,
    note: "Estimated from resource class and region defaults.",
  }));
  const total = Math.round(lines.reduce((s, l) => s + l.monthlyUsd, 0) * 100) / 100;
  return {
    monitoringAlerts: [
      {
        severity: "warning",
        code: "SQS_AGE",
        title: "Queue depth",
        message: "ApproximateAgeOfOldestMessage elevated on primary queue.",
        resourceId: nodes.find((n) => n.type === "aws_sqs_queue")?.id,
      },
    ],
    recommendations: [
      {
        category: "reliability",
        priority: "medium",
        title: "Dead-letter queue",
        message: "Add a DLQ and redrive policy for async consumers.",
        resourceId: nodes.find((n) => n.type === "aws_sqs_queue")?.id,
      },
    ],
    onCallAlerts: [
      {
        severity: "high",
        status: "firing",
        code: "LAMBDA_ERRORS",
        title: "Lambda error rate",
        message: "Error count above threshold in the last 5 minutes.",
        resourceName: nodes.find((n) => n.type === "aws_lambda_function")?.name ?? "worker",
        logGroup: "/aws/lambda/processor",
        metricSummary: "Errors > 5 / 5m",
        detectedAt: new Date().toISOString(),
      },
    ],
    billingLines: lines,
    estimatedMonthlyUsd: total,
    billingDisclaimer: "Indicative estimates — not an AWS invoice.",
  };
}

function requireSession(sessionId: string): Session {
  const s = loadSession(sessionId);
  if (!s) throw new Error("Session not found");
  return s;
}

function formatUtcTimestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

function docRefsForTopology(topology: Topology): DocReference[] {
  const seen = new Set<string>();
  const refs: DocReference[] = [];
  const ver = topology.awsProviderVersion || "5.0";
  for (const n of topology.nodes) {
    if (seen.has(n.type)) continue;
    seen.add(n.type);
    const slug = n.type.replace(/^aws_/, "");
    refs.push({
      resourceType: n.type,
      providerVersion: ver,
      title: slug.replace(/_/g, " "),
      url: `https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/${slug}`,
      category: "resource",
    });
  }
  return refs;
}

function buildTerraformFiles(topology: Topology): Record<string, string> {
  const project = topology.projectName.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase() || "stack";
  const tfVer = topology.terraformCoreVersion || "1.5.0";
  const awsVer = topology.awsProviderVersion || "5.0";
  const files: Record<string, string> = {};

  files["infra/versions.tf"] = `terraform {
  required_version = ">= ${tfVer}"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> ${awsVer}"
    }
  }
}
`;

  files["infra/main.tf"] = `provider "aws" {
  region = var.aws_region
}
`;

  files["infra/variables.tf"] = `variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}
`;

  files["infra/outputs.tf"] = `output "project_name" {
  value = var.project_name
}
`;

  const connectivity: string[] = [];
  for (const n of topology.nodes) {
    const id = terraformResourceKey(n.type, n.name);
    const block = resourceBlock(n, id);
    const path = resourceFilePath(n.type);
    files[path] = (files[path] ?? "") + block;
  }

  for (const e of topology.edges) {
    const src = topology.nodes.find((x) => x.id === e.source);
    const tgt = topology.nodes.find((x) => x.id === e.target);
    if (!src || !tgt) continue;
    if (!isSupportedConnection(src.type, tgt.type)) continue;
    const kind = inferEdgeKind(src.type, tgt.type);
    const snippet = connectivitySnippet(kind, src, tgt, topology);
    if (snippet) connectivity.push(snippet);
  }

  files["infra/connectivity.tf"] =
    connectivity.length > 0 ? connectivity.join("\n\n") : "# No standard integrations between resources\n";

  files[`infra/${project}.tfvars.example`] = `project_name = "${topology.projectName}"
environment  = "dev"
aws_region   = "eu-west-1"
`;

  return files;
}

function resourceFilePath(type: string): string {
  const map: Record<string, string> = {
    aws_sns_topic: "infra/sns.tf",
    aws_sqs_queue: "infra/sqs.tf",
    aws_lambda_function: "infra/lambda.tf",
    aws_s3_bucket: "infra/s3.tf",
    aws_dynamodb_table: "infra/dynamodb.tf",
    aws_apigatewayv2_api: "infra/apigateway.tf",
    aws_lb: "infra/alb.tf",
    aws_db_instance: "infra/rds.tf",
    aws_cloudfront_distribution: "infra/cloudfront.tf",
    aws_cognito_user_pool: "infra/cognito.tf",
  };
  return map[type] ?? "infra/other.tf";
}

function resourceBlock(n: TopologyNode, tfId: string): string {
  const name = n.name;
  switch (n.type) {
    case "aws_sns_topic":
      return `resource "aws_sns_topic" "${tfId}" {
  name = "${name}"
}

`;
    case "aws_sqs_queue":
      return `resource "aws_sqs_queue" "${tfId}" {
  name = "${name}"
}

`;
    case "aws_lambda_function":
      return `resource "aws_lambda_function" "${tfId}" {
  function_name = "${name}"
  role          = aws_iam_role.${tfId}_role.arn
  handler       = "index.handler"
  runtime       = "${String(n.config?.runtime ?? "nodejs20.x")}"
  filename      = "\${path.module}/lambda_placeholder.zip"
}

`;
    case "aws_s3_bucket":
      return `resource "aws_s3_bucket" "${tfId}" {
  bucket = "${name}"
}

`;
    default:
      return `# ${n.type} "${name}"\n`;
  }
}

function connectivitySnippet(
  kind: string,
  src: TopologyNode,
  tgt: TopologyNode,
  _topology: Topology,
): string | null {
  const a = terraformResourceKey(src.type, src.name);
  const b = terraformResourceKey(tgt.type, tgt.name);
  if (kind === "sns_to_sqs") {
    return `resource "aws_sns_topic_subscription" "${a}_to_${b}" {
  topic_arn = aws_sns_topic.${a}.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.${b}.arn
}`;
  }
  if (kind === "sqs_to_lambda") {
    return `resource "aws_lambda_event_source_mapping" "${a}_to_${b}" {
  event_source_arn = aws_sqs_queue.${a}.arn
  function_name    = aws_lambda_function.${b}.arn
}`;
  }
  return null;
}