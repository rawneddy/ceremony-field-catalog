package com.ceremony.catalog.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

@Schema(description = "Field observation data containing metadata, field path, and occurrence statistics")
public record CatalogObservationDTO(
    @Schema(
        description = "Metadata key-value pairs that identify the context and characteristics of this field",
        example = """
        {
          "action": "Fulfillment",
          "productCode": "DDA",
          "productSubCode": "4S"
        }
        """,
        requiredMode = Schema.RequiredMode.REQUIRED
    )
    @NotNull(message = "Metadata is required")
    Map<String, String> metadata,
    
    @Schema(
        description = "Field path identifying the location of this field in the document structure",
        example = "/Ceremony/Accounts/Account/FeeCode/Amount",
        requiredMode = Schema.RequiredMode.REQUIRED
    )
    @NotBlank(message = "Field path is required")
    String fieldPath,
    
    @Schema(
        description = "Number of times this field was observed in the current processing batch",
        example = "1",
        minimum = "0"
    )
    @Min(value = 0, message = "Count must be non-negative")
    int count,
    
    @Schema(
        description = "Whether this field was observed to contain null values",
        example = "false"
    )
    @NotNull
    Boolean hasNull,
    
    @Schema(
        description = "Whether this field was observed to contain empty string values",
        example = "true"
    )
    @NotNull
    Boolean hasEmpty
) {}