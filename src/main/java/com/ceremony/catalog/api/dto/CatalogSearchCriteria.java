package com.ceremony.catalog.api.dto;

public record CatalogSearchCriteria(
    String pathType,
    String formCode,
    String formVersion,
    String action,
    String productCode,
    String productSubCode,
    String loanProductCode,
    String xpathContains
) {}