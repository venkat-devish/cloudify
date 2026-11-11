package com.cloudify.api.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class SessionRecord {
    private String id;
    private String mode;
    private Topology topology;
    private Instant createdAt;
    private List<Suggestion> suggestions = new ArrayList<>();
    private List<ResourceValidation> validations = new ArrayList<>();
    private Map<String, String> terraformFiles = new HashMap<>();
    private String pullRequestUrl;
    private String featureBranch;
}
