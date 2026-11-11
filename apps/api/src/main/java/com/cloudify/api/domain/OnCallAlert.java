package com.cloudify.api.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnCallAlert {
    private String severity;
    private String status;
    private String code;
    private String title;
    private String message;
    private String resourceName;
    private String logGroup;
    private String metricSummary;
    private String detectedAt;
}
