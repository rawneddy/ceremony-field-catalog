package com.ceremony.catalog.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ContextDefinitionDTO(
    @NotBlank(message = "Context ID is required")
    String contextId,
    
    @NotBlank(message = "Display name is required") 
    String displayName,
    
    String description,
    
    @NotNull(message = "Required metadata list cannot be null")
    List<String> requiredMetadata,
    
    List<String> optionalMetadata,
    
    @NotNull(message = "Active flag is required")
    Boolean active
) {}