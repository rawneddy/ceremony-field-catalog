package com.ceremony.catalog.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Value;

import java.util.List;

/**
 * DTO for metadata extraction and validation rules.
 */
@Value
@Builder
@AllArgsConstructor
@Schema(description = "Extraction and validation rules for a metadata field")
public class MetadataExtractionRuleDTO {

    @Schema(
        description = "Ordered list of XPath expressions to try for extracting the metadata value. " +
                     "The first XPath that returns a non-empty value will be used.",
        example = "[\"/ceremony/productCode\", \"/header/product\"]",
        requiredMode = Schema.RequiredMode.REQUIRED
    )
    List<String> xpaths;

    @Schema(
        description = "Optional regex pattern for validating extracted values. " +
                     "If provided, extracted values must match this pattern to be considered valid. " +
                     "If null or empty, no validation is performed.",
        example = "^[A-Z]{3}$"
    )
    String validationRegex;
}
