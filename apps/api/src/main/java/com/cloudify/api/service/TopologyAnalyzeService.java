package com.cloudify.api.service;

import com.cloudify.api.domain.AdvisorRecommendation;
import com.cloudify.api.domain.MonitoringAlert;
import com.cloudify.api.domain.ResourceValidation;
import com.cloudify.api.domain.Suggestion;
import com.cloudify.api.domain.Topology;
import com.cloudify.api.web.dto.AnalyzeResponse;
import com.cloudify.api.web.dto.TopologyInsightsResponse;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

/** Combines structural validation with operational advisor hints for the workflow analyze step. */
@Service
public class TopologyAnalyzeService {

    private final TopologyValidationService validationService;
    private final TopologyAdvisorService advisorService;
    private final DocRegistryService docRegistry;

    public TopologyAnalyzeService(
            TopologyValidationService validationService,
            TopologyAdvisorService advisorService,
            DocRegistryService docRegistry) {
        this.validationService = validationService;
        this.advisorService = advisorService;
        this.docRegistry = docRegistry;
    }

    public record AnalyzeResult(AnalyzeResponse response, List<ResourceValidation> validations) {}

    public AnalyzeResult analyze(Topology topology) {
        Topology safe = safeTopology(topology);
        var validation = validationService.validate(safe);
        List<Suggestion> suggestions = new ArrayList<>(validation.suggestions());
        suggestions.addAll(advisorSuggestions(advisorService.analyze(safe)));

        if (suggestions.isEmpty() && !safe.getNodes().isEmpty()) {
            suggestions.add(Suggestion.builder()
                    .severity("info")
                    .code("TOPOLOGY_MINIMAL")
                    .message("Add more resources and connections to receive tailored monitoring and cost suggestions.")
                    .build());
        }

        AnalyzeResponse response = AnalyzeResponse.builder()
                .canContinue(validation.canContinue())
                .suggestions(suggestions)
                .docReferences(docRegistry.referencesForTopology(safe))
                .build();
        return new AnalyzeResult(response, validation.validations());
    }

    private Topology safeTopology(Topology topology) {
        if (topology.getNodes() == null) {
            topology.setNodes(List.of());
        }
        if (topology.getEdges() == null) {
            topology.setEdges(List.of());
        }
        return topology;
    }

    private List<Suggestion> advisorSuggestions(TopologyInsightsResponse insights) {
        List<Suggestion> out = new ArrayList<>();
        if (insights.getMonitoringAlerts() != null) {
            for (MonitoringAlert a : insights.getMonitoringAlerts()) {
                out.add(Suggestion.builder()
                        .severity(a.getSeverity() != null ? a.getSeverity() : "info")
                        .code(a.getCode())
                        .message(a.getTitle() + " — " + a.getMessage())
                        .resourceId(a.getResourceId())
                        .build());
            }
        }
        if (insights.getRecommendations() != null) {
            for (AdvisorRecommendation r : insights.getRecommendations()) {
                String severity = switch (r.getPriority() != null ? r.getPriority() : "low") {
                    case "high" -> "warning";
                    case "medium" -> "info";
                    default -> "info";
                };
                out.add(Suggestion.builder()
                        .severity(severity)
                        .code("ADVISOR_" + (r.getCategory() != null ? r.getCategory().toUpperCase() : "GENERAL"))
                        .message(r.getTitle() + " — " + r.getMessage())
                        .resourceId(r.getResourceId())
                        .build());
            }
        }
        return out;
    }
}
