package com.cloudify.api.web.dto;

import com.cloudify.api.domain.Topology;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class InsightsRequest {
    @NotNull
    @Valid
    private Topology topology;
}
