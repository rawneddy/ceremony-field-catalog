package com.ceremony.catalog.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.HashMap;
import java.util.Map;

public record CatalogSearchRequest(
    String contextId,
    String xpathContains,
    @Min(value = 0, message = "Page must be non-negative") int page,
    @Min(value = 1, message = "Size must be at least 1")
    @Max(value = 1000, message = "Size cannot exceed 1000") int size,
    Map<String, String> metadata
) {
    public CatalogSearchRequest {
        // Defensive defaults and validation
        page = page < 0 ? 0 : page;
        size = size < 1 ? 50 : (size > 1000 ? 1000 : size);
        metadata = metadata != null ? Map.copyOf(metadata) : new HashMap<>();
    }
    
    // Constructor for cases where metadata is populated dynamically
    public CatalogSearchRequest(String contextId, String xpathContains, int page, int size) {
        this(contextId, xpathContains, page, size, new HashMap<>());
    }
    
    // Default constructor equivalent
    public CatalogSearchRequest() {
        this(null, null, 0, 50, new HashMap<>());
    }
    
    public CatalogSearchCriteria toCriteria() {
        return new CatalogSearchCriteria(
            contextId,
            metadata.isEmpty() ? null : metadata,
            xpathContains
        );
    }
}