package com.cloudify.api.web.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PullRequestResponse {
    private String branchName;
    private String pullRequestUrl;
    private boolean mock;
}
