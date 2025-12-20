package com.ceremony.catalog.api.dto;

import java.util.List;
import java.util.Map;

/**
 * Search criteria for catalog entries.
 *
 * Supports two search modes:
 * 1. Global search (q): OR-based search across fieldPath, contextId, AND metadata values
 * 2. Filter search: AND-based search with specific filters (contextId, metadata, fieldPathContains)
 *
 * When q is provided, other filters are ignored.
 *
 * The useRegex flag controls how the search term is interpreted:
 * - false (default): Literal string contains search, special regex chars are escaped
 * - true: Search term is treated as a regex pattern
 *
 * Metadata supports multiple values per key for OR logic within a field.
 * Multiple metadata fields are combined with AND logic between fields.
 */
public record CatalogSearchCriteria(
    String q,
    String contextId,
    Map<String, List<String>> metadata,
    String fieldPathContains,
    boolean useRegex
) {
    /**
     * Constructor for backward compatibility (useRegex defaults to false).
     */
    public CatalogSearchCriteria(String q, String contextId, Map<String, List<String>> metadata, String fieldPathContains) {
        this(q, contextId, metadata, fieldPathContains, false);
    }

    /**
     * Returns true if this is a global search (q parameter is set).
     */
    public boolean isGlobalSearch() {
        return q != null && !q.trim().isEmpty();
    }

    /**
     * Returns the search term with regex special characters escaped (for literal string matching).
     * Only used when useRegex is false.
     */
    public String getEscapedQ() {
        if (q == null) return null;
        // Escape regex special characters: . * + ? ^ $ { } [ ] \ | ( )
        return q.replaceAll("([\\\\\\[\\](){}.*+?^$|])", "\\\\$1");
    }

    /**
     * Returns the search pattern to use (escaped for literal match, or raw for regex mode).
     */
    public String getSearchPattern() {
        if (q == null) return null;
        return useRegex ? q : getEscapedQ();
    }
}