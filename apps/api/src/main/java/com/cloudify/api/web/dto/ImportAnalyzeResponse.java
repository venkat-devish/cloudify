package com.cloudify.api.web.dto;

import com.cloudify.api.domain.Topology;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ImportAnalyzeResponse {
    private String sessionId;
    private Topology topology;
    private String source;
    private String visionProvider;
    private boolean mock;
    private String message;
    private int nodeCount;
    private int edgeCount;
}
