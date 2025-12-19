package com.ceremony.catalog.api.dto;

import java.util.Map;

/**
 * Search criteria for catalog entries.
 *
 * Supports two search modes:
 * 1. Global search (q): OR-based search across fieldPath, metadata values, and contextId
 * 2. Filter search: AND-based search with specific filters (contextId, metadata, fieldPathContains)
 *
 * When q is provided, other filters are ignored.
 */
public record CatalogSearchCriteria(
    String q,
    String contextId,
    Map<String, String> metadata,
    String fieldPathContains
) {
    /**
     * Returns true if this is a global search (q parameter is set).
     */
    public boolean isGlobalSearch() {
        return q != null && !q.trim().isEmpty();
    }
}