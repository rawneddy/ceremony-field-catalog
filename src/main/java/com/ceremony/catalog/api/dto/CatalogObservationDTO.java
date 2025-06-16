package com.ceremony.catalog.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record CatalogObservationDTO(
    @NotNull(message = "Metadata is required")
    Map<String, String> metadata,
    
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