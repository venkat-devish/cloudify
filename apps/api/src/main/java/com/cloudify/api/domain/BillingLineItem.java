package com.cloudify.api.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingLineItem {
    private String resourceId;
    private String resourceName;
    private String resourceType;
    private double monthlyUsd;
    private String note;
}
