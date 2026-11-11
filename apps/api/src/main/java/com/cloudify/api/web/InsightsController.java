package com.cloudify.api.web;

import com.cloudify.api.service.TopologyAdvisorService;
import com.cloudify.api.web.dto.InsightsRequest;
import com.cloudify.api.web.dto.TopologyInsightsResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class InsightsController {
    private final TopologyAdvisorService advisorService;

    public InsightsController(TopologyAdvisorService advisorService) {
        this.advisorService = advisorService;
    }

    @PostMapping("/insights")
    public TopologyInsightsResponse insights(@Valid @RequestBody InsightsRequest request) {
        return advisorService.analyze(request.getTopology());
    }
}
