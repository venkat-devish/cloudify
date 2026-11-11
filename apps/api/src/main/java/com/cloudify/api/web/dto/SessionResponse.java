package com.cloudify.api.web.dto;

import com.cloudify.api.domain.Topology;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SessionResponse {
    private String sessionId;
    private String mode;
    private Topology topology;
}
