package com.ceremony.catalog.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Request body for setting the canonical casing of a field.
 */
@Schema(description = "Request to set or clear the canonical casing for a field")
public record SetCanonicalCasingRequest(
    @Schema(
        description = "The canonical casing to set. Must be one of the observed casings in casingCounts. Set to null to clear.",
        example = "/Customer/Account/Name",
        nullable = true
    )
    String canonicalCasing
) {}
