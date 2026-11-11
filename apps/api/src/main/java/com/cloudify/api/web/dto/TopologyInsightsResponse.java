package com.cloudify.api.web.dto;

import com.cloudify.api.domain.AdvisorRecommendation;
import com.cloudify.api.domain.BillingLineItem;
import com.cloudify.api.domain.MonitoringAlert;
import com.cloudify.api.domain.OnCallAlert;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopologyInsightsResponse {
    private List<OnCallAlert> onCallAlerts;
    private List<MonitoringAlert> monitoringAlerts;
    private List<AdvisorRecommendation> recommendations;
    private List<BillingLineItem> billingLines;
    private double estimatedMonthlyUsd;
    private String billingDisclaimer;
}
