package com.cloudify.api.domain;

import java.util.Map;
import lombok.Data;

@Data
public class TopologyNode {
    private String id;
    private String type;
    private String name;
    private Map<String, Object> config;
    private Double positionX;
    private Double positionY;
}
