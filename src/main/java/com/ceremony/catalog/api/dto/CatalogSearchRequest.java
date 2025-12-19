package com.ceremony.catalog.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.HashMap;
import java.util.Map;

@Schema(description = "Search criteria for finding catalog field entries. Supports two modes: global search (q) or filter search (contextId, fieldPathContains, metadata).")
public record CatalogSearchRequest(
    @Schema(
        description = "Global search term - searches fieldPath, contextId, AND metadata values using OR logic. When provided, other filters are ignored. In string mode (useRegex=false), performs case-insensitive contains match. In regex mode (useRegex=true), treats the term as a regex pattern.",
        example = "Amount",
        requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    String q,

    @Schema(
        description = "Context ID to filter results (optional - leave empty for cross-context search). Ignored when q is provided.",
        example = "deposits",
        requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    String contextId,

    @Schema(
        description = "Field path pattern to search for. Ignored when q is provided. When useRegex=true, treated as regex pattern. When useRegex=false (default), special characters are escaped for literal matching.",
        example = "WithholdingCode",
        requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    String fieldPathContains,

    @Schema(
        description = "When true, treat search terms (q and fieldPathContains) as regex patterns. When false (default), search terms are literal strings with special characters escaped.",
        example = "false",
        defaultValue = "false",
        requiredMode = Schema.RequiredMode.NOT_REQUIRED
    )
    boolean useRegex,

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
        maximum = "250"
    )
    @Min(value = 1, message = "Size must be at least 1")
    @Max(value = 250, message = "Size cannot exceed 250") int size,

    @Schema(
        description = "Dynamic metadata filters - any key-value pairs to filter by. Ignored when q is provided.",
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

    // Constructor for filter-based search (no q parameter)
    public CatalogSearchRequest(String contextId, String fieldPathContains, int page, int size, Map<String, String> metadata) {
        this(null, contextId, fieldPathContains, false, page, size, metadata);
    }

    // Constructor for simple filter search
    public CatalogSearchRequest(String contextId, String fieldPathContains, int page, int size) {
        this(null, contextId, fieldPathContains, false, page, size, new HashMap<>());
    }

    // Default constructor equivalent
    public CatalogSearchRequest() {
        this(null, null, null, false, 0, 50, new HashMap<>());
    }

    public CatalogSearchCriteria toCriteria() {
        return new CatalogSearchCriteria(
            q,
            contextId,
            metadata.isEmpty() ? null : metadata,
            fieldPathContains,
            useRegex
        );
    }
}