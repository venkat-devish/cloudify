package com.cloudify.api.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdvisorRecommendation {
    private String category;
    private String priority;
    private String title;
    private String message;
    private String resourceId;
}
