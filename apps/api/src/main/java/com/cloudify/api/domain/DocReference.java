package com.cloudify.api.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocReference {
    private String resourceType;
    private String providerVersion;
    private String title;
    private String url;
    private String category;
}
