package com.cloudify.api.service;

import com.cloudify.api.domain.Topology;
import com.cloudify.api.domain.TopologyEdge;
import com.cloudify.api.domain.TopologyNode;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class TerraformGeneratorService {

    public Map<String, String> generate(Topology topology) {
        Map<String, String> files = new LinkedHashMap<>();
        String project = sanitize(topology.getProjectName());
        files.put("infra/versions.tf", versions(topology));
        files.put("infra/main.tf", mainTf());
        files.put("infra/variables.tf", variablesTf(project));
        files.put("infra/outputs.tf", "output \"project_name\" {\n  value = var.project_name\n}\n");

        StringBuilder sns = new StringBuilder();
        StringBuilder sqs = new StringBuilder();
        StringBuilder lambda = new StringBuilder();
        StringBuilder s3 = new StringBuilder();
        StringBuilder connectivity = new StringBuilder();

        Map<String, TopologyNode> byId = topology.getNodes().stream()
                .collect(Collectors.toMap(TopologyNode::getId, n -> n, (first, dup) -> dup, LinkedHashMap::new));

        for (TopologyNode n : topology.getNodes()) {
            String id = sanitize(n.getName());
            if ("external_client".equals(n.getType())) {
                continue;
            }
            switch (n.getType()) {
                case "aws_sns_topic" -> sns.append(snsBlock(n, id));
                case "aws_sqs_queue" -> sqs.append(sqsBlock(n, id));
                case "aws_lambda_function" -> lambda.append(lambdaBlock(n, id));
                case "aws_s3_bucket" -> s3.append(s3Block(n, id));
                case "aws_dynamodb_table" -> appendGeneric(files, n, "dynamodb.tf");
                case "aws_apigatewayv2_api" -> appendGeneric(files, n, "apigw.tf");
                case "aws_lb" -> appendGeneric(files, n, "alb.tf");
                case "aws_db_instance" -> appendGeneric(files, n, "rds.tf");
                case "aws_cloudfront_distribution" -> appendGeneric(files, n, "cloudfront.tf");
                case "aws_cognito_user_pool" -> appendGeneric(files, n, "cognito.tf");
                default -> { }
            }
        }

        for (TopologyEdge e : topology.getEdges()) {
            TopologyNode src = byId.get(e.getSource());
            TopologyNode tgt = byId.get(e.getTarget());
            if (src == null || tgt == null) {
                continue;
            }
            String kind = e.getKind() != null ? e.getKind() : inferKind(src.getType(), tgt.getType());
            if (kind == null) {
                continue;
            }
            String s = sanitize(src.getName());
            String t = sanitize(tgt.getName());
            switch (kind) {
                case "sns_to_sqs" -> connectivity.append(snsToSqs(s, t));
                case "sqs_to_lambda" -> connectivity.append(sqsToLambda(s, t));
                case "lambda_to_s3" -> connectivity.append(lambdaToS3(s, t));
                default -> { }
            }
        }

        putIfNonEmpty(files, "infra/sns.tf", sns);
        putIfNonEmpty(files, "infra/sqs.tf", sqs);
        putIfNonEmpty(files, "infra/lambda.tf", lambda);
        putIfNonEmpty(files, "infra/s3.tf", s3);
        files.put("infra/connectivity.tf", connectivity.isEmpty() ? "# No edges\n" : connectivity.toString());
        files.put("infra/" + project + ".tfvars.example", "project_name = \"" + project + "\"\nenvironment  = \"dev\"\naws_region   = \"eu-west-1\"\n");
        if (!lambda.isEmpty()) {
            files.put("infra/lambda_placeholder.js", "exports.handler = async () => ({ statusCode: 200, body: 'ok' });\n");
        }
        return files;
    }

    private void putIfNonEmpty(Map<String, String> files, String path, StringBuilder sb) {
        if (!sb.isEmpty()) {
            files.put(path, sb.toString());
        }
    }

    private String inferKind(String srcType, String tgtType) {
        if ("aws_sns_topic".equals(srcType) && "aws_sqs_queue".equals(tgtType)) {
            return "sns_to_sqs";
        }
        if ("aws_sqs_queue".equals(srcType) && "aws_lambda_function".equals(tgtType)) {
            return "sqs_to_lambda";
        }
        if ("aws_lambda_function".equals(srcType) && "aws_s3_bucket".equals(tgtType)) {
            return "lambda_to_s3";
        }
        return null;
    }

    private String versions(Topology topology) {
        return "terraform {\n  required_version = \">= " + topology.getTerraformCoreVersion() + "\"\n"
                + "  required_providers {\n    aws = {\n      source  = \"hashicorp/aws\"\n"
                + "      version = \"~> " + topology.getAwsProviderVersion() + "\"\n    }\n  }\n}\n\n"
                + "provider \"aws\" {\n  region = var.aws_region\n}\n";
    }

    private String mainTf() {
        return "locals {\n  tags = {\n    ManagedBy   = \"Terraform\"\n    GeneratedBy = \"Cloudify\"\n"
                + "    Environment = var.environment\n    Service     = var.project_name\n  }\n}\n";
    }

    private String variablesTf(String project) {
        return """
                variable "project_name" {
                  type    = string
                  default = "%s"
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
                """.formatted(project);
    }

    private String snsBlock(TopologyNode n, String id) {
        String display = config(n, "displayName", "");
        StringBuilder sb = new StringBuilder();
        sb.append("\nresource \"aws_sns_topic\" \"").append(id).append("\" {\n  name = \"${var.project_name}-")
                .append(id).append("\"\n");
        if (!display.isBlank()) {
            sb.append("  display_name = \"").append(display.replace("\\", "\\\\").replace("\"", "\\\"")).append("\"\n");
        }
        sb.append("  tags = local.tags\n}\n");
        return sb.toString();
    }

    private String sqsBlock(TopologyNode n, String id) {
        int visibility = intConfig(n, "visibilityTimeoutSeconds", 60);
        int retention = intConfig(n, "messageRetentionSeconds", 345600);
        return "\nresource \"aws_sqs_queue\" \"" + id + "\" {\n  name                       = \"${var.project_name}-" + id + "\"\n"
                + "  visibility_timeout_seconds = " + visibility + "\n"
                + "  message_retention_seconds  = " + retention + "\n"
                + "  tags                       = local.tags\n}\n";
    }

    private String lambdaBlock(TopologyNode n, String id) {
        String runtime = config(n, "runtime", "nodejs20.x");
        return """
                resource "aws_iam_role" "%s-role" {
                  name = "${var.project_name}-%s-role"
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

                resource "aws_iam_role_policy_attachment" "%s-lambda-basic" {
                  role       = aws_iam_role.%s-role.name
                  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
                }

                resource "aws_lambda_function" "%s" {
                  function_name = "${var.project_name}-%s"
                  role          = aws_iam_role.%s-role.arn
                  handler       = "lambda_placeholder.handler"
                  runtime       = "%s"
                  filename      = var.lambda_placeholder_zip
                  tags          = local.tags
                }
                """
                .formatted(id, id, id, id, id, id, id, runtime);
    }

    private String s3Block(TopologyNode n, String id) {
        boolean versioning = booleanConfig(n, "versioning", true);
        String versioningBlock = versioning
                ? """

                resource "aws_s3_bucket_versioning" "%s" {
                  bucket = aws_s3_bucket.%s.id
                  versioning_configuration {
                    status = "Enabled"
                  }
                }
                """.formatted(id, id)
                : "";
        return """
                resource "aws_s3_bucket" "%s" {
                  bucket = replace(lower("${var.project_name}-%s-${var.environment}"), "_", "-")
                  tags   = local.tags
                }
                %s
                """
                .formatted(id, id, versioningBlock);
    }

    private boolean booleanConfig(TopologyNode n, String key, boolean def) {
        if (n.getConfig() == null || !n.getConfig().containsKey(key)) {
            return def;
        }
        Object v = n.getConfig().get(key);
        if (v instanceof Boolean b) {
            return b;
        }
        return Boolean.parseBoolean(config(n, key, String.valueOf(def)));
    }

    private String snsToSqs(String s, String q) {
        String sub = s + "_to_" + q;
        return """
                resource "aws_sns_topic_subscription" "%s" {
                  topic_arn = aws_sns_topic.%s.arn
                  protocol  = "sqs"
                  endpoint  = aws_sqs_queue.%s.arn
                }

                resource "aws_sqs_queue_policy" "%s_queue_policy" {
                  queue_url = aws_sqs_queue.%s.id
                  policy = jsonencode({
                    Version = "2012-10-17"
                    Statement = [{
                      Sid       = "AllowSNSToSend"
                      Effect    = "Allow"
                      Principal = { Service = "sns.amazonaws.com" }
                      Action    = "sqs:SendMessage"
                      Resource  = aws_sqs_queue.%s.arn
                      Condition = {
                        ArnEquals = {
                          "aws:SourceArn" = aws_sns_topic.%s.arn
                        }
                      }
                    }]
                  })
                }
                """
                .formatted(sub, s, q, sub, q, q, s);
    }

    private String sqsToLambda(String q, String l) {
        String mapping = q + "_" + l;
        return """
                resource "aws_lambda_event_source_mapping" "%s" {
                  event_source_arn = aws_sqs_queue.%s.arn
                  function_name    = aws_lambda_function.%s.arn
                  batch_size       = 10
                }

                resource "aws_iam_role_policy_attachment" "%s-sqs-consumer" {
                  role       = aws_iam_role.%s-role.name
                  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole"
                }
                """
                .formatted(mapping, q, l, l, l);
    }

    private String lambdaToS3(String l, String b) {
        return """
                resource "aws_iam_role_policy" "%s-s3-%s" {
                  name = "${var.project_name}-%s-s3-%s"
                  role = aws_iam_role.%s-role.id
                  policy = jsonencode({
                    Version = "2012-10-17"
                    Statement = [{
                      Effect = "Allow"
                      Action = [
                        "s3:GetObject",
                        "s3:PutObject",
                        "s3:ListBucket",
                      ]
                      Resource = [
                        aws_s3_bucket.%s.arn,
                        "${aws_s3_bucket.%s.arn}/*",
                      ]
                    }]
                  })
                }
                """
                .formatted(l, b, l, b, l, b, b);
    }

    private String sanitize(String name) {
        if (name == null) {
            return "resource";
        }
        String s = name.toLowerCase().replaceAll("[^a-z0-9-]", "-").replaceAll("-+", "-");
        s = s.replaceAll("^-|-$", "");
        return s.isEmpty() ? "resource" : s;
    }

    private String config(TopologyNode n, String key, String def) {
        if (n.getConfig() == null || !n.getConfig().containsKey(key)) {
            return def;
        }
        Object v = n.getConfig().get(key);
        return v != null ? v.toString() : def;
    }

    private int intConfig(TopologyNode n, String key, int def) {
        try {
            return Integer.parseInt(config(n, key, String.valueOf(def)));
        } catch (NumberFormatException e) {
            return def;
        }
    }

    private void appendGeneric(Map<String, String> files, TopologyNode n, String file) {
        String key = "infra/" + file;
        String id = sanitize(n.getName());
        String block = files.getOrDefault(key, "");
        block += "\n# Cloudify stub for " + n.getType() + "\n";
        block += "resource \"" + n.getType() + "\" \"" + id + "\" {\n  tags = local.tags\n}\n";
        files.put(key, block);
    }
}
