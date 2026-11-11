package com.cloudify.api.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Suggestion {
    private String severity;
    private String code;
    private String message;
    private String resourceId;
    private String docUrl;
}
