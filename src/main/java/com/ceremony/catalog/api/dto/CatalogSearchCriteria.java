package com.ceremony.catalog.api.dto;

import java.util.Map;

public record CatalogSearchCriteria(
    String contextId,
    Map<String, String> metadata,
    String xpathContains
) {}