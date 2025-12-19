package com.ceremony.catalog.api.dto;

import com.ceremony.catalog.domain.Context;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

/**
 * Context DTO with optional field count for UI display.
 */
@Schema(description = "Context definition with optional field count")
public record ContextWithCountDTO(
    @Schema(description = "Unique context identifier", example = "deposits")
    String contextId,

    @Schema(description = "Human-readable display name", example = "Deposit Processing")
    String displayName,

    @Schema(description = "Context description", example = "Fields observed during deposit processing")
    String description,

    @Schema(description = "Required metadata fields for observations in this context", example = "[\"productCode\", \"action\"]")
    List<String> requiredMetadata,

    @Schema(description = "Optional metadata fields for observations in this context", example = "[\"channel\", \"region\"]")
    List<String> optionalMetadata,

    @Schema(description = "Whether the context is accepting new observations", example = "true")
    boolean active,

    @Schema(description = "Context creation timestamp")
    Instant createdAt,

    @Schema(description = "Context last update timestamp")
    Instant updatedAt,

    @Schema(description = "Number of field entries in this context (only present when includeCounts=true)", example = "1247")
    Long fieldCount
) {
    /**
     * Create from Context domain object without field count.
     */
    public static ContextWithCountDTO from(Context context) {
        return from(context, null);
    }

    /**
     * Create from Context domain object with optional field count.
     */
    public static ContextWithCountDTO from(Context context, Long fieldCount) {
        return new ContextWithCountDTO(
            context.getContextId(),
            context.getDisplayName(),
            context.getDescription(),
            context.getRequiredMetadata(),
            context.getOptionalMetadata(),
            context.isActive(),
            context.getCreatedAt(),
            context.getUpdatedAt(),
            fieldCount
        );
    }
}
