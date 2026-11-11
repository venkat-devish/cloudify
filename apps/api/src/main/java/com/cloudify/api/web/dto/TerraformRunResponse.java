package com.cloudify.api.web.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TerraformRunResponse {
    private boolean success;
    private String initOutput;
    private String validateOutput;
    private String planOutput;
    private String applyOutput;
    private boolean applied;
}
