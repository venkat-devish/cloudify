package com.cloudify.api.web.dto;

import com.cloudify.api.domain.DocReference;
import com.cloudify.api.domain.Suggestion;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AnalyzeResponse {
    private boolean canContinue;
    private List<Suggestion> suggestions;
    private List<DocReference> docReferences;
}
