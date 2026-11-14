package com.cloudify.api.web;

import com.cloudify.api.domain.ResourceValidation;
import com.cloudify.api.domain.SessionRecord;
import com.cloudify.api.service.DocRegistryService;
import com.cloudify.api.service.PullRequestService;
import com.cloudify.api.service.TerraformCliService;
import com.cloudify.api.service.TerraformGeneratorService;
import com.cloudify.api.service.TopologyAdvisorService;
import com.cloudify.api.service.TopologyAnalyzeService;
import com.cloudify.api.service.TopologyValidationService;
import com.cloudify.api.web.dto.TopologyInsightsResponse;
import com.cloudify.api.store.SessionStore;
import com.cloudify.api.web.dto.AnalyzeResponse;
import com.cloudify.api.web.dto.CreateSessionRequest;
import com.cloudify.api.web.dto.PullRequestResponse;
import com.cloudify.api.web.dto.SessionResponse;
import com.cloudify.api.web.dto.TerraformResponse;
import com.cloudify.api.web.dto.TerraformRunResponse;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/sessions")
public class SessionController {
    private final SessionStore store;
    private final TopologyValidationService validationService;
    private final TerraformGeneratorService terraformGenerator;
    private final PullRequestService pullRequestService;
    private final DocRegistryService docRegistry;
    private final TerraformCliService terraformCli;
    private final TopologyAdvisorService advisorService;
    private final TopologyAnalyzeService analyzeService;

    public SessionController(SessionStore store,
            TopologyValidationService validationService,
            TerraformGeneratorService terraformGenerator,
            PullRequestService pullRequestService,
            DocRegistryService docRegistry,
            TerraformCliService terraformCli,
            TopologyAdvisorService advisorService,
            TopologyAnalyzeService analyzeService) {
        this.store = store;
        this.validationService = validationService;
        this.terraformGenerator = terraformGenerator;
        this.pullRequestService = pullRequestService;
        this.docRegistry = docRegistry;
        this.terraformCli = terraformCli;
        this.advisorService = advisorService;
        this.analyzeService = analyzeService;
    }

    private SessionRecord require(String id) {
        return store.find(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
    }

    @PostMapping
    public SessionResponse create(@Valid @RequestBody CreateSessionRequest request) {
        SessionRecord record = new SessionRecord();
        record.setId(UUID.randomUUID().toString());
        record.setMode(request.getMode());
        record.setTopology(request.getTopology());
        record.setCreatedAt(Instant.now());
        store.save(record);
        return SessionResponse.builder()
                .sessionId(record.getId())
                .mode(record.getMode())
                .topology(record.getTopology())
                .build();
    }

    @GetMapping("/{id}")
    public SessionResponse get(@PathVariable String id) {
        SessionRecord r = require(id);
        return SessionResponse.builder().sessionId(r.getId()).mode(r.getMode()).topology(r.getTopology()).build();
    }

    @PostMapping("/{id}/analyze")
    public AnalyzeResponse analyze(@PathVariable String id) {
        SessionRecord r = require(id);
        var result = analyzeService.analyze(r.getTopology());
        r.setSuggestions(result.response().getSuggestions());
        r.setValidations(result.validations());
        store.save(r);
        return result.response();
    }

    @GetMapping("/{id}/insights")
    public TopologyInsightsResponse insights(@PathVariable String id) {
        SessionRecord r = require(id);
        return advisorService.analyze(r.getTopology());
    }

    @GetMapping("/{id}/validation")
    public List<ResourceValidation> validation(@PathVariable String id) {
        SessionRecord r = require(id);
        if (r.getValidations().isEmpty()) {
            var result = validationService.validate(r.getTopology());
            r.setValidations(result.validations());
            r.setSuggestions(result.suggestions());
            store.save(r);
        }
        return r.getValidations();
    }

    @PostMapping("/{id}/terraform")
    public TerraformResponse terraform(@PathVariable String id) {
        SessionRecord r = require(id);
        Map<String, String> files = terraformGenerator.generate(r.getTopology());
        r.setTerraformFiles(files);
        store.save(r);
        int lines = files.values().stream().mapToInt(s -> s.split("\\n").length).sum();
        return TerraformResponse.builder().files(files).fileCount(files.size()).totalLines(lines).build();
    }



    @PostMapping("/{id}/terraform/run")
    public TerraformRunResponse terraformRun(@PathVariable String id,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "false") boolean apply) {
        SessionRecord r = require(id);
        if (r.getTerraformFiles().isEmpty()) {
            r.setTerraformFiles(terraformGenerator.generate(r.getTopology()));
            store.save(r);
        }
        try {
            var result = terraformCli.run(r.getTerraformFiles(), apply);
            return TerraformRunResponse.builder()
                    .success(result.success())
                    .initOutput(result.initOutput())
                    .validateOutput(result.validateOutput())
                    .planOutput(result.planOutput())
                    .applyOutput(result.applyOutput())
                    .applied(result.applied())
                    .build();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    @PostMapping("/{id}/pull-request")
    public PullRequestResponse pullRequest(@PathVariable String id) {
        SessionRecord r = require(id);
        if (r.getTerraformFiles().isEmpty()) {
            r.setTerraformFiles(terraformGenerator.generate(r.getTopology()));
            store.save(r);
        }
        boolean cached =
                r.getPullRequestUrl() != null
                        && !r.getPullRequestUrl().isBlank()
                        && r.getFeatureBranch() != null
                        && !r.getFeatureBranch().isBlank();
        boolean cachedWasMockCompare = cached && r.getPullRequestUrl().contains("/compare/");
        if (cached && !(cachedWasMockCompare && !pullRequestService.isMockDelivery())) {
            return PullRequestResponse.builder()
                    .branchName(r.getFeatureBranch())
                    .pullRequestUrl(r.getPullRequestUrl())
                    .mock(pullRequestService.isMockDelivery() || cachedWasMockCompare)
                    .build();
        }
        try {
            var pr = pullRequestService.createPullRequest(r);
            r.setFeatureBranch(pr.branchName());
            r.setPullRequestUrl(pr.pullRequestUrl());
            store.save(r);
            return PullRequestResponse.builder()
                    .branchName(pr.branchName())
                    .pullRequestUrl(pr.pullRequestUrl())
                    .mock(pr.mock())
                    .build();
        } catch (RestClientResponseException e) {
            String detail = e.getResponseBodyAsString();
            if (detail != null && detail.length() > 400) {
                detail = detail.substring(0, 400) + "…";
            }
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "GitHub API " + e.getStatusCode().value() + (detail == null || detail.isBlank() ? "" : ": " + detail));
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, e.getMessage());
        }
    }
}
