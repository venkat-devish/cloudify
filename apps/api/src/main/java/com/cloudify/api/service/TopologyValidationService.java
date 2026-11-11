package com.cloudify.api.service;

import com.cloudify.api.domain.ResourceValidation;
import com.cloudify.api.domain.Suggestion;
import com.cloudify.api.domain.Topology;
import com.cloudify.api.domain.TopologyEdge;
import com.cloudify.api.domain.TopologyNode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class TopologyValidationService {
    private final DocRegistryService docRegistry;

    public TopologyValidationService(DocRegistryService docRegistry) {
        this.docRegistry = docRegistry;
    }

    public record ValidationResult(List<Suggestion> suggestions, List<ResourceValidation> validations, boolean canContinue) {}

    public ValidationResult validate(Topology topology) {
        List<Suggestion> suggestions = new ArrayList<>();
        List<ResourceValidation> validations = new ArrayList<>();
        List<TopologyNode> nodes = topology.getNodes() != null ? topology.getNodes() : List.of();
        List<TopologyEdge> edges = topology.getEdges() != null ? topology.getEdges() : List.of();
        Map<String, TopologyNode> nodesById = new HashMap<>();
        for (TopologyNode n : nodes) {
            nodesById.put(n.getId(), n);
        }
        Set<String> connected = new HashSet<>();
        for (TopologyEdge e : edges) {
            if ("external_client".equals(nodesById.getOrDefault(e.getSource(), new TopologyNode()).getType())) {
                continue;
            }
            connected.add(e.getSource());
            connected.add(e.getTarget());
            validateEdge(e, nodesById, suggestions);
        }
        for (TopologyNode n : nodes) {
            String status = "external_client".equals(n.getType()) || connected.contains(n.getId()) || nodes.size() == 1 ? "READY" : "WARNING";
            validations.add(ResourceValidation.builder()
                    .nodeId(n.getId())
                    .name(n.getName())
                    .type(n.getType())
                    .status(status)
                    .build());
            if (!connected.contains(n.getId()) && nodes.size() > 1) {
                suggestions.add(Suggestion.builder()
                        .severity("warning")
                        .code("UNCONNECTED_RESOURCE")
                        .message("Resource \"" + n.getName() + "\" has no connections.")
                        .resourceId(n.getId())
                        .docUrl(docRegistry.docUrlForResource(n.getType()))
                        .build());
            }
            checkNodeConfig(n, suggestions);
        }
        boolean hasError = suggestions.stream().anyMatch(s -> "error".equals(s.getSeverity()));
        boolean canContinue = !hasError && !nodes.isEmpty();
        return new ValidationResult(suggestions, validations, canContinue);
    }

    private void validateEdge(TopologyEdge e, Map<String, TopologyNode> nodes, List<Suggestion> suggestions) {
        TopologyNode src = nodes.get(e.getSource());
        TopologyNode tgt = nodes.get(e.getTarget());
        if (src == null || tgt == null) {
            suggestions.add(Suggestion.builder().severity("error").code("INVALID_EDGE")
                    .message("Edge references missing node.").build());
            return;
        }
        String kind = e.getKind() != null ? e.getKind() : inferKind(src.getType(), tgt.getType());
        if ("generic".equals(kind)) {
            suggestions.add(Suggestion.builder().severity("error").code("UNSUPPORTED_EDGE")
                    .message("Unsupported link " + src.getType() + " -> " + tgt.getType())
                    .resourceId(tgt.getId())
                    .build());
        }
    }

    private String inferKind(String srcType, String tgtType) {
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

    private void checkNodeConfig(TopologyNode n, List<Suggestion> suggestions) {
        if ("aws_lambda_function".equals(n.getType())) {
            Object runtime = n.getConfig() != null ? n.getConfig().get("runtime") : null;
            if (runtime == null || runtime.toString().isBlank()) {
                suggestions.add(Suggestion.builder().severity("error").code("LAMBDA_RUNTIME")
                        .message("Lambda \"" + n.getName() + "\" requires a runtime.")
                        .resourceId(n.getId())
                        .docUrl(docRegistry.docUrlForResource("aws_lambda_function"))
                        .build());
            }
        }
    }
}
