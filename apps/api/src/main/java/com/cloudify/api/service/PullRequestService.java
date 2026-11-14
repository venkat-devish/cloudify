package com.cloudify.api.service;

import com.cloudify.api.domain.SessionRecord;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

@Service
public class PullRequestService {
    @Value("${cloudify.github.enabled:false}")
    private boolean githubEnabled;

    @Value("${cloudify.github.owner:}")
    private String owner;

    @Value("${cloudify.github.repository:cloudify-infra}")
    private String repository;

    @Value("${cloudify.github.default-branch:main}")
    private String defaultBranch;

    @Value("classpath:cloudify/github-workflow-terraform-aws.yml")
    private Resource githubWorkflowTemplate;

    private final GitHubService gitHubService;

    public PullRequestService(GitHubService gitHubService) {
        this.gitHubService = gitHubService;
    }

    public record PrResult(String branchName, String pullRequestUrl, boolean mock) {}

    public boolean isMockDelivery() {
        return !githubEnabled;
    }

    public PrResult createPullRequest(SessionRecord session) {
        String timestamp = DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(ZoneOffset.UTC).format(Instant.now());
        String slug = session.getTopology().getProjectName().toLowerCase().replaceAll("[^a-z0-9-]", "-");
        String branch = "cloudify/" + slug + "-" + timestamp;
        Map<String, String> files = new HashMap<>(session.getTerraformFiles());

        if (githubEnabled) {
            attachGithubWorkflow(files);
            var pushed = gitHubService.pushTerraformAndOpenPr(branch, session.getTopology().getProjectName(), files);
            return new PrResult(branch, pushed.pullRequestUrl(), false);
        }

        String compare =
                "https://github.com/"
                        + encodeSegment(owner.isBlank() ? "venkat-devish" : owner)
                        + "/"
                        + encodeSegment(repository)
                        + "/compare/"
                        + defaultBranch
                        + "..."
                        + branch;
        return new PrResult(branch, compare, true);
    }

    private static String encodeSegment(String s) {
        return s.replace(" ", "%20");
    }

    private void attachGithubWorkflow(Map<String, String> files) {
        String key = ".github/workflows/terraform-aws.yml";
        if (files.containsKey(key)) {
            return;
        }
        try {
            String yaml = githubWorkflowTemplate.getContentAsString(StandardCharsets.UTF_8);
            files.put(key, yaml);
        } catch (IOException e) {
            throw new IllegalStateException("Missing classpath workflow template", e);
        }
    }
}
