package com.cloudify.api.service;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.cloudify.api.domain.Topology;
import com.cloudify.api.domain.TopologyEdge;
import com.cloudify.api.domain.TopologyNode;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TerraformGeneratorServiceTest {

    private final TerraformGeneratorService generator = new TerraformGeneratorService();

    @Test
    void goldenPipelineIncludesConnectivityAndConfigFromCanvas() {
        Topology topology = goldenTopology();
        Map<String, String> files = generator.generate(topology);

        String sqs = files.get("infra/sqs.tf");
        assertNotNull(sqs);
        assertTrue(sqs.contains("visibility_timeout_seconds = 90"));
        assertTrue(sqs.contains("message_retention_seconds  = 86400"));

        String lambda = files.get("infra/lambda.tf");
        assertNotNull(lambda);
        assertTrue(lambda.contains("runtime       = \"nodejs18.x\""));

        String s3 = files.get("infra/s3.tf");
        assertNotNull(s3);
        assertTrue(s3.contains("aws_s3_bucket_versioning"));

        String connectivity = files.get("infra/connectivity.tf");
        assertNotNull(connectivity);
        assertTrue(connectivity.contains("aws_sns_topic_subscription"));
        assertTrue(connectivity.contains("aws_lambda_event_source_mapping"));
        assertTrue(connectivity.contains("aws_iam_role_policy"));
    }

    @Test
    void versionsReflectTopologyProviderPins() {
        Topology topology = goldenTopology();
        String versions = generator.generate(topology).get("infra/versions.tf");

        assertNotNull(versions);
        assertTrue(versions.contains("required_version = \">= 1.6.0\""));
        assertTrue(versions.contains("version = \"~> 5.50\""));
    }

    @Test
    void s3VersioningOffOmitsVersioningResource() {
        Topology topology = goldenTopology();
        topology.getNodes().stream()
                .filter(n -> "aws_s3_bucket".equals(n.getType()))
                .forEach(n -> n.setConfig(Map.of("versioning", false)));

        String s3 = generator.generate(topology).get("infra/s3.tf");
        assertNotNull(s3);
        assertTrue(s3.contains("aws_s3_bucket"));
        assertTrue(!s3.contains("aws_s3_bucket_versioning"));
    }

    private static Topology goldenTopology() {
        Topology t = new Topology();
        t.setProjectName("OrderPipeline");
        t.setTerraformCoreVersion("1.6.0");
        t.setAwsProviderVersion("5.50");
        t.setNodes(List.of(
                node("n-1", "aws_sns_topic", "orders-topic", Map.of()),
                node(
                        "n-2",
                        "aws_sqs_queue",
                        "orders-queue",
                        Map.of("visibilityTimeoutSeconds", 90, "messageRetentionSeconds", 86400)),
                node("n-3", "aws_lambda_function", "orders-processor", Map.of("runtime", "nodejs18.x")),
                node("n-4", "aws_s3_bucket", "order-artifacts", Map.of("versioning", true))));
        t.setEdges(List.of(
                edge("e-1", "n-1", "n-2", "sns_to_sqs"),
                edge("e-2", "n-2", "n-3", "sqs_to_lambda"),
                edge("e-3", "n-3", "n-4", "lambda_to_s3")));
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
