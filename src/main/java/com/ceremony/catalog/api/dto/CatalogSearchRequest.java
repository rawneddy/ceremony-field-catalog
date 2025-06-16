package com.ceremony.catalog.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Data
@NoArgsConstructor
public class CatalogSearchRequest {
    private String contextId;
    private String xpathContains;
    
    @Min(value = 0, message = "Page must be non-negative")
    private int page = 0;
    
    @Min(value = 1, message = "Size must be at least 1")
    @Max(value = 1000, message = "Size cannot exceed 1000")
    private int size = 50;
    
    // This will be populated dynamically from any query parameters
    // that don't match the known fields above
    private Map<String, String> metadata = new HashMap<>();
    
    public CatalogSearchCriteria toCriteria() {
        return new CatalogSearchCriteria(
            contextId,
            metadata.isEmpty() ? null : metadata,
            xpathContains
        );
    }
}