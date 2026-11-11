package com.cloudify.api.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.cloudify.api.domain.Topology;
import com.cloudify.api.domain.TopologyEdge;
import com.cloudify.api.domain.TopologyNode;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TopologyAnalyzeServiceTest {

    private TopologyAnalyzeService analyzeService;

    @BeforeEach
    void setUp() {
        analyzeService = new TopologyAnalyzeService(
                new TopologyValidationService(new DocRegistryService()),
                new TopologyAdvisorService(),
                new DocRegistryService());
    }

    @Test
    void analyzeMergesAdvisorHintsForPipeline() {
        Topology topology = pipelineTopology();
        var result = analyzeService.analyze(topology);

        assertTrue(result.response().getSuggestions().size() > 2);
        assertTrue(result.response().getDocReferences().size() >= 4);
        assertTrue(result.response().isCanContinue());
    }

    @Test
    void analyzeBlocksWhenLambdaRuntimeMissing() {
        Topology topology = pipelineTopology();
        topology.getNodes().stream()
                .filter(n -> "aws_lambda_function".equals(n.getType()))
                .forEach(n -> n.setConfig(Map.of()));
        var result = analyzeService.analyze(topology);

        assertFalse(result.response().isCanContinue());
        assertTrue(result.response().getSuggestions().stream().anyMatch(s -> "LAMBDA_RUNTIME".equals(s.getCode())));
    }

    private static Topology pipelineTopology() {
        Topology t = new Topology();
        t.setProjectName("orders");
        t.setTerraformCoreVersion("1.5.0");
        t.setAwsProviderVersion("5.0");
        t.setNodes(List.of(
                node("n-sns", "aws_sns_topic", "orders-topic", Map.of()),
                node("n-sqs", "aws_sqs_queue", "orders-queue", Map.of()),
                node("n-lambda", "aws_lambda_function", "processor", Map.of("runtime", "nodejs20.x")),
                node("n-s3", "aws_s3_bucket", "artifacts", Map.of())));
        t.setEdges(List.of(
                edge("e1", "n-sns", "n-sqs", "sns_to_sqs"),
                edge("e2", "n-sqs", "n-lambda", "sqs_to_lambda"),
                edge("e3", "n-lambda", "n-s3", "lambda_to_s3")));
        return t;
    }

    private static TopologyNode node(String id, String type, String name, Map<String, Object> config) {
        TopologyNode n = new TopologyNode();
        n.setId(id);
        n.setType(type);
        n.setName(name);
        n.setConfig(config);
        return n;
    }

    private static TopologyEdge edge(String id, String source, String target, String kind) {
        TopologyEdge e = new TopologyEdge();
        e.setId(id);
        e.setSource(source);
        e.setTarget(target);
        e.setKind(kind);
        return e;
    }
}
