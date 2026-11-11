package com.cloudify.api.service;

import com.cloudify.api.domain.DocReference;
import com.cloudify.api.domain.Topology;
import com.cloudify.api.domain.TopologyNode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class DocRegistryService {
    private static final String REGISTRY = "https://registry.terraform.io";

    private final Map<String, String> staticUrls = new ConcurrentHashMap<>();
    private final RestClient client = RestClient.create();

    public DocRegistryService() {
        staticUrls.put("aws_sns_topic", "/providers/hashicorp/aws/latest/docs/resources/sns_topic");
        staticUrls.put("aws_sqs_queue", "/providers/hashicorp/aws/latest/docs/resources/sqs_queue");
        staticUrls.put("aws_lambda_function", "/providers/hashicorp/aws/latest/docs/resources/lambda_function");
        staticUrls.put("aws_s3_bucket", "/providers/hashicorp/aws/latest/docs/resources/s3_bucket");
        staticUrls.put("aws_sns_topic_subscription", "/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription");
        staticUrls.put("aws_lambda_event_source_mapping", "/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping");
        staticUrls.put("aws_iam_role_policy", "/providers/hashicorp/aws/latest/docs/resources/iam_role_policy");
        staticUrls.put("aws_dynamodb_table", "/providers/hashicorp/aws/latest/docs/resources/dynamodb_table");
        staticUrls.put("aws_apigatewayv2_api", "/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api");
        staticUrls.put("aws_lb", "/providers/hashicorp/aws/latest/docs/resources/lb");
        staticUrls.put("aws_db_instance", "/providers/hashicorp/aws/latest/docs/resources/db_instance");
        staticUrls.put("aws_cloudfront_distribution", "/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution");
        staticUrls.put("aws_cognito_user_pool", "/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool");
    }

    public String docUrlForResource(String resourceType) {
        String path = staticUrls.getOrDefault(resourceType, "/providers/hashicorp/aws/latest/docs");
        return REGISTRY + path;
    }

    public List<DocReference> referencesForTopology(Topology topology) {
        String version = topology.getAwsProviderVersion();
        Set<String> types = new LinkedHashSet<>();
        for (TopologyNode n : topology.getNodes()) {
            types.add(n.getType());
        }
        types.add("aws_sns_topic_subscription");
        types.add("aws_lambda_event_source_mapping");
        types.add("aws_iam_role_policy");

        List<DocReference> refs = new ArrayList<>();
        for (String type : types) {
            refs.add(DocReference.builder()
                    .resourceType(type)
                    .providerVersion(version)
                    .title(type.replace("aws_", "").replace('_', ' '))
                    .url(docUrlForResource(type))
                    .category("registry.terraform.io")
                    .build());
        }
        return refs;
    }
}
