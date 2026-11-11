package com.cloudify.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.cloudify.api.domain.Topology;
import com.cloudify.api.domain.TopologyEdge;
import com.cloudify.api.domain.TopologyNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TopologyValidationServiceTest {

    private TopologyValidationService validation;

    @BeforeEach
    void setUp() {
        validation = new TopologyValidationService(new DocRegistryService());
    }

    @Test
    void validPipelineCanContinueWithNoErrors() {
        Topology topology = pipelineTopology();
        var result = validation.validate(topology);

        assertTrue(result.canContinue());
        assertFalse(result.suggestions().stream().anyMatch(s -> "error".equals(s.getSeverity())));
    }

    @Test
    void unsupportedEdgeIsError() {
        Topology topology = pipelineTopology();
        topology.getEdges().add(edge("e-bad", "n-s3", "n-sns", "generic"));
        var result = validation.validate(topology);

        assertFalse(result.canContinue());
        assertTrue(result.suggestions().stream().anyMatch(s -> "UNSUPPORTED_EDGE".equals(s.getCode())));
    }

    @Test
    void unconnectedResourceProducesWarning() {
        Topology topology = pipelineTopology();
        topology.getNodes().add(node("n-orphan", "aws_dynamodb_table", "events-store", Map.of()));
        var result = validation.validate(topology);

        assertTrue(result.suggestions().stream().anyMatch(s -> "UNCONNECTED_RESOURCE".equals(s.getCode())));
        assertTrue(result.canContinue());
    }

    @Test
    void lambdaWithoutRuntimeIsError() {
        Topology topology = pipelineTopology();
        topology.getNodes().stream()
                .filter(n -> "aws_lambda_function".equals(n.getType()))
                .forEach(n -> n.setConfig(Map.of()));
        var result = validation.validate(topology);

        assertFalse(result.canContinue());
        assertTrue(result.suggestions().stream().anyMatch(s -> "LAMBDA_RUNTIME".equals(s.getCode())));
    }

    @Test
    void emptyTopologyCannotContinue() {
        Topology topology = new Topology();
        topology.setProjectName("empty");
        topology.setNodes(List.of());
        topology.setEdges(List.of());
        var result = validation.validate(topology);

        assertFalse(result.canContinue());
        assertEquals(0, result.suggestions().size());
    }

    private static Topology pipelineTopology() {
        Topology t = new Topology();
        t.setProjectName("orders");
        t.setTerraformCoreVersion("1.5.0");
        t.setAwsProviderVersion("5.0");
        List<TopologyNode> nodes = new ArrayList<>(List.of(
                node("n-sns", "aws_sns_topic", "orders-topic", Map.of()),
                node("n-sqs", "aws_sqs_queue", "orders-queue", Map.of("visibilityTimeoutSeconds", 120)),
                node("n-lambda", "aws_lambda_function", "processor", Map.of("runtime", "python3.12")),
                node("n-s3", "aws_s3_bucket", "artifacts", Map.of("versioning", true))));
        List<TopologyEdge> edges = new ArrayList<>(List.of(
                edge("e1", "n-sns", "n-sqs", "sns_to_sqs"),
                edge("e2", "n-sqs", "n-lambda", "sqs_to_lambda"),
                edge("e3", "n-lambda", "n-s3", "lambda_to_s3")));
        t.setNodes(nodes);
        t.setEdges(edges);
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
