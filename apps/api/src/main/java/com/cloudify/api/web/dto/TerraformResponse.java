package com.cloudify.api.web.dto;

import java.util.Map;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TerraformResponse {
    private Map<String, String> files;
    private int fileCount;
    private int totalLines;
}
