package com.cloudify.api.service;

import com.cloudify.api.domain.Topology;
import com.cloudify.api.service.TopologyGraphBuilder.ImportedEdge;
import com.cloudify.api.service.TopologyGraphBuilder.ImportedNode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

@Service
public class VisionImportService {

    private static final String PROMPT = """
            You analyze AWS architecture diagrams. Return ONLY valid JSON (no markdown) with this shape:
            {"nodes":[{"label":"SNS","type":"aws_sns_topic","x":0,"y":0}],"edges":[{"source":"SNS","target":"SQS"}]}
            Rules:
            - type must be one of: aws_sns_topic, aws_sqs_queue, aws_lambda_function, aws_s3_bucket, \
            aws_dynamodb_table, aws_apigatewayv2_api, aws_lb, aws_db_instance, aws_cloudfront_distribution, \
            aws_cognito_user_pool, external_client
            - Infer edges left-to-right or top-to-bottom data flow when arrows are visible.
            - Use short AWS-style labels from the diagram.
            """;

    private final ObjectMapper mapper = new ObjectMapper();
    private final RestClient http = RestClient.create();

    @Value("${cloudify.vision.provider:auto}")
    private String provider;

    @Value("${cloudify.vision.gemini-api-key:}")
    private String geminiKey;

    @Value("${cloudify.vision.gemini-model:gemini-2.0-flash}")
    private String geminiModel;

    @Value("${cloudify.vision.ollama-base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${cloudify.vision.ollama-vision-model:llava}")
    private String ollamaModel;

    public record VisionResult(Topology topology, String provider, boolean mock, String detail) {}

    public VisionResult analyzeImage(MultipartFile file, String projectName) throws Exception {
        String mime = file.getContentType() != null ? file.getContentType() : "image/png";
        byte[] bytes = file.getBytes();
        String chosen = resolveProvider();
        String json = switch (chosen) {
            case "gemini" -> callGemini(bytes, mime);
            case "ollama" -> callOllama(bytes, mime);
            case "mock" -> mockJson();
            default -> callWithFallback(bytes, mime);
        };
        Topology topology = parseVisionJson(json, projectName);
        boolean mock = "mock".equals(chosen) || json.contains("\"demo\"");
        String detail = mock
                ? "Demo topology — set GEMINI_API_KEY or run Ollama (VISION_PROVIDER=ollama) for real vision."
                : "Analyzed with " + chosen;
        return new VisionResult(topology, chosen, mock, detail);
    }

    private String resolveProvider() {
        String p = provider == null ? "auto" : provider.toLowerCase(Locale.ROOT);
        if ("auto".equals(p)) {
            if (geminiKey != null && !geminiKey.isBlank()) return "gemini";
            if (ollamaReachable()) return "ollama";
            return "mock";
        }
        return p;
    }

    private String callWithFallback(byte[] bytes, String mime) throws Exception {
        if (geminiKey != null && !geminiKey.isBlank()) {
            try {
                return callGemini(bytes, mime);
            } catch (Exception ignored) {
                /* try next */
            }
        }
        if (ollamaReachable()) {
            try {
                return callOllama(bytes, mime);
            } catch (Exception ignored) {
                /* try next */
            }
        }
        return mockJson();
    }

    private boolean ollamaReachable() {
        try {
            http.get().uri(ollamaBaseUrl + "/api/tags").retrieve().toBodilessEntity();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String callGemini(byte[] bytes, String mime) {
        String b64 = Base64.getEncoder().encodeToString(bytes);
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel
                + ":generateContent?key=" + geminiKey;
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(
                        Map.of("text", PROMPT),
                        Map.of("inline_data", Map.of("mime_type", mime, "data", b64))))),
                "generationConfig", Map.of("temperature", 0.2, "responseMimeType", "application/json"));
        try {
            JsonNode root = http.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            return root.at("/candidates/0/content/parts/0/text").asText();
        } catch (RestClientResponseException e) {
            throw new IllegalStateException("Gemini vision failed: " + e.getResponseBodyAsString(), e);
        }
    }

    private String callOllama(byte[] bytes, String mime) {
        String b64 = Base64.getEncoder().encodeToString(bytes);
        Map<String, Object> body = Map.of(
                "model", ollamaModel,
                "stream", false,
                "messages", List.of(Map.of(
                        "role", "user",
                        "content", PROMPT + "\nRespond with JSON only.",
                        "images", List.of(b64))));
        try {
            JsonNode root = http.post()
                    .uri(ollamaBaseUrl + "/api/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            return root.path("message").path("content").asText();
        } catch (RestClientResponseException e) {
            throw new IllegalStateException("Ollama vision failed: " + e.getResponseBodyAsString(), e);
        }
    }

    private String mockJson() {
        return """
                {"demo":true,"nodes":[
                {"label":"orders-topic","type":"aws_sns_topic","x":40,"y":80},
                {"label":"orders-queue","type":"aws_sqs_queue","x":260,"y":80},
                {"label":"processor","type":"aws_lambda_function","x":480,"y":80},
                {"label":"artifacts","type":"aws_s3_bucket","x":700,"y":80}
                ],"edges":[
                {"source":"orders-topic","target":"orders-queue"},
                {"source":"orders-queue","target":"processor"},
                {"source":"processor","target":"artifacts"}
                ]}""";
    }

    private Topology parseVisionJson(String json, String projectName) throws Exception {
        String cleaned = json.strip();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceAll("^```json\\s*", "").replaceAll("^```\\s*", "").replaceAll("```$", "").trim();
        }
        JsonNode root = mapper.readTree(cleaned);
        List<ImportedNode> nodes = new ArrayList<>();
        for (JsonNode n : root.path("nodes")) {
            nodes.add(new ImportedNode(
                    n.path("label").asText(""),
                    n.path("type").asText(null),
                    n.has("x") ? n.get("x").asDouble() : null,
                    n.has("y") ? n.get("y").asDouble() : null));
        }
        List<ImportedEdge> edges = new ArrayList<>();
        for (JsonNode e : root.path("edges")) {
            edges.add(new ImportedEdge(e.path("source").asText(), e.path("target").asText()));
        }
        if (edges.isEmpty() && nodes.size() > 1) {
            for (int i = 0; i < nodes.size() - 1; i++) {
                edges.add(new ImportedEdge(nodes.get(i).label(), nodes.get(i + 1).label()));
            }
        }
        return TopologyGraphBuilder.build(projectName, nodes, edges);
    }
}
