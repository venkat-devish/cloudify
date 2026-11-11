package com.cloudify.api.service;

import com.cloudify.api.domain.Topology;
import com.cloudify.api.domain.TopologyEdge;
import com.cloudify.api.domain.TopologyNode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/** Builds validated {@link Topology} graphs from import / vision payloads. */
public final class TopologyGraphBuilder {
    private TopologyGraphBuilder() {}

    public static Topology build(String projectName, List<ImportedNode> nodes, List<ImportedEdge> edges) {
        Topology t = new Topology();
        t.setProjectName(projectName);
        t.setTerraformCoreVersion("1.5.0");
        t.setAwsProviderVersion("5.0");
        Map<String, String> nameToId = new HashMap<>();
        List<TopologyNode> topoNodes = new ArrayList<>();
        int seq = 1;
        int col = 0;
        for (ImportedNode n : nodes) {
            String type = mapLabelToType(n.label(), n.typeHint()).orElse(null);
            if (type == null) {
                continue;
            }
            String id = "n-" + seq++;
            String name = sanitizeName(n.label());
            nameToId.put(name.toLowerCase(Locale.ROOT), id);
            TopologyNode node = new TopologyNode();
            node.setId(id);
            node.setType(type);
            node.setName(name);
            node.setPositionX(n.x() != null ? n.x() : (double) (col * 220));
            node.setPositionY(n.y() != null ? n.y() : 120.0);
            if ("aws_lambda_function".equals(type)) {
                node.setConfig(Map.of("runtime", "nodejs20.x"));
            }
            topoNodes.add(node);
            col++;
        }
        List<TopologyEdge> topoEdges = new ArrayList<>();
        int ei = 1;
        for (ImportedEdge e : edges) {
            String src = resolveId(nameToId, e.source());
            String tgt = resolveId(nameToId, e.target());
            if (src == null || tgt == null) {
                continue;
            }
            TopologyNode srcNode = topoNodes.stream().filter(n -> n.getId().equals(src)).findFirst().orElse(null);
            TopologyNode tgtNode = topoNodes.stream().filter(n -> n.getId().equals(tgt)).findFirst().orElse(null);
            if (srcNode == null || tgtNode == null) {
                continue;
            }
            String kind = inferKind(srcNode.getType(), tgtNode.getType());
            TopologyEdge edge = new TopologyEdge();
            edge.setId("e-" + ei++);
            edge.setSource(src);
            edge.setTarget(tgt);
            edge.setKind(kind);
            topoEdges.add(edge);
        }
        t.setNodes(topoNodes);
        t.setEdges(topoEdges);
        return t;
    }

    public static Optional<String> mapLabelToType(String label, String typeHint) {
        if (typeHint != null && !typeHint.isBlank() && typeHint.startsWith("aws_")) {
            return Optional.of(typeHint);
        }
        String l = (label == null ? "" : label).toLowerCase(Locale.ROOT);
        if (l.contains("sns")) return Optional.of("aws_sns_topic");
        if (l.contains("sqs") || l.contains("queue")) return Optional.of("aws_sqs_queue");
        if (l.contains("lambda")) return Optional.of("aws_lambda_function");
        if (l.contains("s3") || l.contains("bucket")) return Optional.of("aws_s3_bucket");
        if (l.contains("dynamo")) return Optional.of("aws_dynamodb_table");
        if (l.contains("api") && l.contains("gateway")) return Optional.of("aws_apigatewayv2_api");
        if (l.contains("gateway") && !l.contains("api")) return Optional.of("aws_apigatewayv2_api");
        if (l.contains("load balancer") || l.contains("alb")) return Optional.of("aws_lb");
        if (l.contains("rds") || l.contains("database")) return Optional.of("aws_db_instance");
        if (l.contains("cloudfront") || l.contains("cdn")) return Optional.of("aws_cloudfront_distribution");
        if (l.contains("cognito")) return Optional.of("aws_cognito_user_pool");
        if (l.contains("client")) return Optional.of("external_client");
        return Optional.empty();
    }

    private static String resolveId(Map<String, String> nameToId, String ref) {
        if (ref == null) return null;
        String key = ref.toLowerCase(Locale.ROOT).trim();
        if (nameToId.containsKey(key)) return nameToId.get(key);
        return nameToId.get(sanitizeName(ref).toLowerCase(Locale.ROOT));
    }

    private static String sanitizeName(String label) {
        String s = label == null || label.isBlank() ? "resource" : label.trim();
        return s.replaceAll("[^a-zA-Z0-9-_]", "-").replaceAll("-+", "-");
    }

    private static String inferKind(String srcType, String tgtType) {
        if ("aws_sns_topic".equals(srcType) && "aws_sqs_queue".equals(tgtType)) return "sns_to_sqs";
        if ("aws_sqs_queue".equals(srcType) && "aws_lambda_function".equals(tgtType)) return "sqs_to_lambda";
        if ("aws_lambda_function".equals(srcType) && "aws_s3_bucket".equals(tgtType)) return "lambda_to_s3";
        if ("aws_apigatewayv2_api".equals(srcType) && "aws_lambda_function".equals(tgtType)) return "api_to_lambda";
        if ("aws_lb".equals(srcType) && "aws_lambda_function".equals(tgtType)) return "alb_to_lambda";
        if ("aws_lambda_function".equals(srcType) && "aws_dynamodb_table".equals(tgtType)) return "lambda_to_dynamodb";
        if ("aws_cloudfront_distribution".equals(srcType) && "aws_lb".equals(tgtType)) return "cloudfront_to_alb";
        if ("external_client".equals(srcType) && "aws_sns_topic".equals(tgtType)) return "client_to_sns";
        if ("external_client".equals(srcType) && "aws_apigatewayv2_api".equals(tgtType)) return "client_to_api";
        return "generic";
    }

    public record ImportedNode(String label, String typeHint, Double x, Double y) {}

    public record ImportedEdge(String source, String target) {}
}
