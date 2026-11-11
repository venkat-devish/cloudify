package com.cloudify.api.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Data;

@Data
public class Topology {
    @NotBlank
    private String projectName;
    @NotBlank
    private String terraformCoreVersion;
    @NotBlank
    private String awsProviderVersion;
    @NotNull
    private List<TopologyNode> nodes;
    @NotNull
    private List<TopologyEdge> edges;
}
