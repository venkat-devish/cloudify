package com.cloudify.api.service;

import com.cloudify.api.domain.AdvisorRecommendation;
import com.cloudify.api.domain.BillingLineItem;
import com.cloudify.api.domain.MonitoringAlert;
import com.cloudify.api.domain.OnCallAlert;
import com.cloudify.api.domain.Topology;
import com.cloudify.api.domain.TopologyEdge;
import com.cloudify.api.domain.TopologyNode;
import com.cloudify.api.web.dto.TopologyInsightsResponse;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class TopologyAdvisorService {

    public TopologyInsightsResponse analyze(Topology topology) {
        List<OnCallAlert> onCall = new ArrayList<>();
        List<MonitoringAlert> alerts = new ArrayList<>();
        List<AdvisorRecommendation> recommendations = new ArrayList<>();
        List<BillingLineItem> billing = new ArrayList<>();

        Map<String, TopologyNode> nodesById = new HashMap<>();
        for (TopologyNode n : topology.getNodes()) {
            nodesById.put(n.getId(), n);
        }

        Set<String> sqsIds = new HashSet<>();
        Set<String> lambdaIds = new HashSet<>();
        Set<String> snsTargets = new HashSet<>();
        boolean hasApiGateway = false;
        boolean hasCognito = false;

        for (TopologyNode n : topology.getNodes()) {
            switch (n.getType()) {
                case "aws_sqs_queue" -> sqsIds.add(n.getId());
                case "aws_lambda_function" -> lambdaIds.add(n.getId());
                case "aws_apigatewayv2_api" -> hasApiGateway = true;
                case "aws_cognito_user_pool" -> hasCognito = true;
                default -> { }
            }
            billing.add(billingFor(n));
        }

        for (TopologyEdge e : topology.getEdges()) {
            TopologyNode src = nodesById.get(e.getSource());
            TopologyNode tgt = nodesById.get(e.getTarget());
            if (src == null || tgt == null) {
                continue;
            }
            if ("aws_sns_topic".equals(src.getType()) && "aws_sqs_queue".equals(tgt.getType())) {
                snsTargets.add(tgt.getId());
            }
            if ("aws_sqs_queue".equals(src.getType()) && "aws_lambda_function".equals(tgt.getType())) {
                addSqsConsumerLoadHints(src, tgt, alerts, recommendations);
            }
        }

        for (String sqsId : sqsIds) {
            if (!snsTargets.contains(sqsId)) {
                alerts.add(alert("info", "SQS_STANDALONE", "Queue depth alarm",
                        "Add CloudWatch alarm on ApproximateAgeOfOldestMessage for queue \""
                                + nodeName(nodesById.get(sqsId)) + "\".",
                        sqsId));
            }
            alerts.add(alert("warning", "SQS_DLQ", "Dead-letter queue",
                    "Configure a DLQ and alarm on DLQ depth for \"" + nodeName(nodesById.get(sqsId)) + "\".",
                    sqsId));
        }

        for (String lambdaId : lambdaIds) {
            alerts.add(alert("warning", "LAMBDA_ERRORS", "Error rate alarm",
                    "Create CloudWatch alarm on Lambda Errors and Throttles for \""
                            + nodeName(nodesById.get(lambdaId)) + "\".",
                    lambdaId));
            alerts.add(alert("info", "LAMBDA_DURATION", "Duration p99",
                    "Track Duration p99 to catch cold starts or downstream slowness.", lambdaId));
        }

        if (hasApiGateway && !hasCognito) {
            alerts.add(alert("warning", "API_AUTH", "Public API surface",
                    "API Gateway is in the diagram without Cognito — add auth or WAF rules in production.", null));
            recommendations.add(rec("security", "high", "Add authentication",
                    "Attach Amazon Cognito or IAM authorizer before exposing HTTP routes.", null));
        }

        if (topology.getNodes().size() > 4 && lambdaIds.size() == 1) {
            recommendations.add(rec("resilience", "medium", "Split compute paths",
                    "Several resources fan into one Lambda — consider reserved concurrency per critical queue.", null));
        }

        if (lambdaIds.size() > 0 && topology.getEdges().stream().filter(ed -> {
            TopologyNode s = nodesById.get(ed.getSource());
            return s != null && "aws_lambda_function".equals(s.getType());
        }).count() >= 2) {
            recommendations.add(rec("architecture", "medium", "Orchestration",
                    "Multiple outbound Lambda links — evaluate Step Functions for retries and visibility.", null));
        }

        long storageNodes = topology.getNodes().stream()
                .filter(n -> "aws_s3_bucket".equals(n.getType()))
                .count();
        if (storageNodes > 0) {
            recommendations.add(rec("cost", "low", "S3 lifecycle",
                    "Enable lifecycle policies on object prefixes to tier cold data to IA/Glacier.", null));
        }

        if (!topology.getNodes().isEmpty()) {
            onCall.addAll(buildOnCallSignals(topology, nodesById, sqsIds, lambdaIds, hasApiGateway));
        }

        if (topology.getNodes().isEmpty()) {
            alerts.clear();
            recommendations.clear();
            billing.clear();
            onCall.clear();
        }

        double total = billing.stream().mapToDouble(BillingLineItem::getMonthlyUsd).sum();
        return TopologyInsightsResponse.builder()
                .onCallAlerts(onCall)
                .monitoringAlerts(alerts)
                .recommendations(recommendations)
                .billingLines(billing)
                .estimatedMonthlyUsd(round2(total))
                .billingDisclaimer("Indicative us-east-1 list pricing for a light dev workload; not a quote.")
                .build();
    }

    private List<OnCallAlert> buildOnCallSignals(Topology topology, Map<String, TopologyNode> nodesById,
            Set<String> sqsIds, Set<String> lambdaIds, boolean hasApiGateway) {
        List<OnCallAlert> list = new ArrayList<>();
        String ts = "2026-03-10T14:32:00Z";

        for (String sqsId : sqsIds) {
            TopologyNode q = nodesById.get(sqsId);
            String name = nodeName(q);
            list.add(onCall("critical", "firing", "DLQ_DEPTH", "Dead-letter queue depth rising",
                    "ApproximateNumberOfMessagesVisible on " + name + "-dlq exceeded threshold.",
                    name + "-dlq", "/aws/sqs/" + name + "-dlq", "Depth 142 (+38% vs 1h ago)", ts));
        }

        for (String lambdaId : lambdaIds) {
            TopologyNode fn = nodesById.get(lambdaId);
            String name = nodeName(fn);
            list.add(onCall("warning", "firing", "LAMBDA_TIMEOUT", "Lambda duration near timeout",
                    "P99 duration for " + name + " is 28.4s with 30s configured limit.",
                    name, "/aws/lambda/" + name, "Errors 24 (15 TIMEOUT) last 15m", ts));
            list.add(onCall("warning", "firing", "LOG_ERROR_RATE", "Elevated ERROR logs in CloudWatch",
                    "Filter pattern [ERROR] matched 312 events in 5 minutes for " + name + ".",
                    name, "/aws/lambda/" + name, "ERROR rate 4.2× baseline", ts));
        }

        if (hasApiGateway) {
            list.add(onCall("critical", "acknowledged", "API_5XX", "API Gateway 5xx spike",
                    "Integration latency and downstream Lambda timeouts correlated with 5xx responses.",
                    "orders-api", "/aws/apigateway/orders-api", "5xx 8.1% (15m)", ts));
        }

        if (topology.getEdges().stream().anyMatch(e -> {
            TopologyNode s = nodesById.get(e.getSource());
            TopologyNode t = nodesById.get(e.getTarget());
            return s != null && t != null && "aws_sqs_queue".equals(s.getType())
                    && "aws_lambda_function".equals(t.getType());
        })) {
            list.add(onCall("info", "firing", "SQS_AGE", "Oldest message age increasing",
                    "Consumer may be starved — check concurrency and batching on the Lambda poller.",
                    "orders-queue", "/aws/sqs/orders-queue", "Age of oldest: 6m 12s", ts));
        }

        return list;
    }

    private OnCallAlert onCall(String severity, String status, String code, String title, String message,
            String resourceName, String logGroup, String metricSummary, String detectedAt) {
        return OnCallAlert.builder()
                .severity(severity)
                .status(status)
                .code(code)
                .title(title)
                .message(message)
                .resourceName(resourceName)
                .logGroup(logGroup)
                .metricSummary(metricSummary)
                .detectedAt(detectedAt)
                .build();
    }

    private void addSqsConsumerLoadHints(TopologyNode queue, TopologyNode lambda,
            List<MonitoringAlert> alerts, List<AdvisorRecommendation> recs) {
        alerts.add(alert("info", "SQS_BACKLOG", "Consumer lag",
                "Alarm when Visible messages stay high — consumer may be under-provisioned.", queue.getId()));
        recs.add(rec("performance", "medium", "Tune batch window",
                "For \"" + nodeName(lambda) + "\", increase SQS batch size or reserved concurrency under sustained load.",
                lambda.getId()));
    }

    private BillingLineItem billingFor(TopologyNode n) {
        double usd = switch (n.getType()) {
            case "external_client" -> 0;
            case "aws_lambda_function" -> 8;
            case "aws_sqs_queue" -> 1.5;
            case "aws_sns_topic" -> 1;
            case "aws_s3_bucket" -> 3;
            case "aws_dynamodb_table" -> 12;
            case "aws_apigatewayv2_api" -> 4;
            case "aws_lb" -> 22;
            case "aws_db_instance" -> 55;
            case "aws_cloudfront_distribution" -> 6;
            case "aws_cognito_user_pool" -> 0;
            default -> 2;
        };
        return BillingLineItem.builder()
                .resourceId(n.getId())
                .resourceName(n.getName())
                .resourceType(n.getType())
                .monthlyUsd(usd)
                .note("Baseline assumption · scales with traffic")
                .build();
    }

    private MonitoringAlert alert(String severity, String code, String title, String message, String resourceId) {
        return MonitoringAlert.builder()
                .severity(severity)
                .code(code)
                .title(title)
                .message(message)
                .resourceId(resourceId)
                .build();
    }

    private AdvisorRecommendation rec(String category, String priority, String title, String message, String resourceId) {
        return AdvisorRecommendation.builder()
                .category(category)
                .priority(priority)
                .title(title)
                .message(message)
                .resourceId(resourceId)
                .build();
    }

    private String nodeName(TopologyNode n) {
        return n != null && n.getName() != null ? n.getName() : "resource";
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
