package com.ceremony.catalog.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.HashMap;
import java.util.Map;

@Schema(description = "Search criteria for finding catalog field entries")
public record CatalogSearchRequest(
    @Schema(
        description = "Context ID to filter results (optional - leave empty for cross-context search)",
        example = "deposits",
        requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    String contextId,
    
    @Schema(
        description = "Field path pattern to search for (case-insensitive regex match)",
        example = "WithholdingCode",
        requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    String fieldPathContains,
    
    @Schema(
        description = "Page number for pagination (0-based)",
        example = "0",
        minimum = "0"
    )
    @Min(value = 0, message = "Page must be non-negative") int page,
    
    @Schema(
        description = "Number of results per page",
        example = "20",
        minimum = "1",
        maximum = "1000"
    )
    @Min(value = 1, message = "Size must be at least 1")
    @Max(value = 1000, message = "Size cannot exceed 1000") int size,
    
    @Schema(
        description = "Dynamic metadata filters - any key-value pairs to filter by",
        example = """
        {
          "productCode": "DDA",
          "productSubCode": "4S"
        }
        """,
        requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    Map<String, String> metadata
) {
    public CatalogSearchRequest {
        // Defensive defaults and validation
        page = page < 0 ? 0 : page;
        size = size < 1 ? 50 : size; // Default will be overridden by controller if needed
        metadata = metadata != null ? Map.copyOf(metadata) : new HashMap<>();
    }
    
    // Constructor for cases where metadata is populated dynamically
    public CatalogSearchRequest(String contextId, String fieldPathContains, int page, int size) {
        this(contextId, fieldPathContains, page, size, new HashMap<>());
    }
    
    // Default constructor equivalent
    public CatalogSearchRequest() {
        this(null, null, 0, 50, new HashMap<>());
    }
    
    public CatalogSearchCriteria toCriteria() {
        return new CatalogSearchCriteria(
            contextId,
            metadata.isEmpty() ? null : metadata,
            fieldPathContains
        );
    }
}