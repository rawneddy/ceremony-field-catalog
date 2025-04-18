package com.ceremony.catalog.api.dto;

public record CatalogObservationDTO(
    String pathType,
    String formCode,
    String formVersion,
    String action,
    String productCode,
    String productSubCode,
    String loanProductCode,
    String xpath,
    String dataType,
    int count,
    boolean hasNull,
    boolean hasEmpty
) {}