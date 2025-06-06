package com.ceremony.catalog.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CatalogObservationDTO(
    @NotBlank(message = "Path type is required")
    String pathType,
    
    String formCode,
    String formVersion,
    String action,
    String productCode,
    String productSubCode,
    String loanProductCode,
    
    @NotBlank(message = "XPath is required")
    String xpath,
    
    @NotBlank(message = "Data type is required")
    String dataType,
    
    @Min(value = 0, message = "Count must be non-negative")
    int count,
    
    @NotNull
    Boolean hasNull,
    
    @NotNull
    Boolean hasEmpty
) {}