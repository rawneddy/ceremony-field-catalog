package com.ceremony.catalog.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.Map;

/**
 * Context definition that specifies metadata requirements and validation rules.
 * Uses builder pattern for easier construction and future-proof evolution.
 */
@Value
@Builder(toBuilder = true)
@AllArgsConstructor
@Schema(description = "Context definition that specifies metadata requirements and validation rules")
public class ContextDefinitionDTO {

    @Schema(
        description = "Unique identifier for the context",
        example = "deposits",
        requiredMode = Schema.RequiredMode.REQUIRED
    )
    @NotBlank(message = "Context ID is required")
    String contextId;

    @Schema(
        description = "Human-readable name for the context",
        example = "Deposits",
        requiredMode = Schema.RequiredMode.REQUIRED
    )
    @NotBlank(message = "Display name is required")
    String displayName;

    @Schema(
        description = "Optional description explaining the purpose of this context",
        example = "Ceremony XML processing for account deposits"
    )
    String description;

    @Schema(
        description = "List of metadata fields that must be present in all observations for this context",
        example = "[\"productCode\", \"productSubCode\", \"action\"]",
        requiredMode = Schema.RequiredMode.REQUIRED
    )
    @NotNull(message = "Required metadata list cannot be null")
    List<String> requiredMetadata;

    @Schema(
        description = "List of metadata fields that may optionally be present in observations",
        example = "[\"region\", \"businessUnit\"]"
    )
    List<String> optionalMetadata;

    @Schema(
        description = "Rules for automatically extracting and validating metadata values from XML. " +
                     "Map of metadata field name to extraction/validation rules. " +
                     "Keys must match declared required or optional metadata fields.",
        example = "{\"productCode\": {\"xpaths\": [\"/ceremony/productCode\"], \"validationRegex\": \"^[A-Z]{3}$\"}}"
    )
    Map<String, MetadataExtractionRuleDTO> metadataRules;

    @Schema(
        description = "Whether this context is active and accepting new observations",
        example = "true",
        requiredMode = Schema.RequiredMode.REQUIRED
    )
    @NotNull(message = "Active flag is required")
    Boolean active;
}
