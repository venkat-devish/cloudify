package com.cloudify.api.domain;

import lombok.Data;

@Data
public class TopologyEdge {
    private String id;
    private String source;
    private String target;
    private String kind;
}
