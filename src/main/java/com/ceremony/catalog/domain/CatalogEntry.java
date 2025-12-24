package com.ceremony.catalog.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.Collections;
import java.util.Map;
import java.util.Set;

/**
 * A catalog entry representing a unique field observation within a specific schema variant.
 *
 * <p>Identity is determined by: contextId + required metadata + normalized (lowercase) fieldPath.
 * The same field path can have multiple entries if it appears in different schema variants
 * (different required metadata combinations).
 *
 * <p>Metadata is split into two categories:
 * <ul>
 *   <li>{@code requiredMetadata}: Single-value fields that form part of the field identity.
 *       These are immutable once the entry is created.</li>
 *   <li>{@code optionalMetadata}: Multi-value fields that track all observed values over time.
 *       These support filtering like "show fields observed in state=CA" where the field may
 *       have been observed with multiple states.</li>
 * </ul>
 *
 * <p>Casing tracking: {@code fieldPath} is always stored lowercase for identity/search purposes.
 * Observed casings are tracked separately in {@code casingCounts}, and users can select a
 * {@code canonicalCasing} for schema export.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document("catalog_fields")
public class CatalogEntry {
    @Id
    private String id;

    @Field("contextid")
    private String contextId;

    /**
     * Required metadata fields that form part of the field identity.
     * Single value per key, immutable after creation.
     */
    @Field("requiredmetadata")
    @Getter(AccessLevel.NONE)
    private Map<String, String> requiredMetadata;

    /**
     * Optional metadata fields tracking all observed values.
     * Values are accumulated over time as observations are merged.
     * Supports filtering like "show fields observed with docCode=XYZ".
     */
    @Field("optionalmetadata")
    @Getter(AccessLevel.NONE)
    private Map<String, Set<String>> optionalMetadata;

    /**
     * Returns required metadata, never null (empty map if not set).
     */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public Map<String, String> getRequiredMetadata() {
        return requiredMetadata != null ? requiredMetadata : Collections.emptyMap();
    }

    /**
     * Returns optional metadata, never null (empty map if not set).
     */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public Map<String, Set<String>> getOptionalMetadata() {
        return optionalMetadata != null ? optionalMetadata : Collections.emptyMap();
    }

    @Field("fieldpath")
    private String fieldPath;

    @Field("maxoccurs")
    private int maxOccurs;

    @Field("minoccurs")
    private int minOccurs;

    @Field("allowsnull")
    private boolean allowsNull;

    @Field("allowsempty")
    private boolean allowsEmpty;

    @Field("firstobservedat")
    private java.time.Instant firstObservedAt;

    @Field("lastobservedat")
    private java.time.Instant lastObservedAt;

    /**
     * Tracks observed field path casings with their occurrence counts.
     * Keys are the original casings (e.g., "AccountNumber", "accountnumber"),
     * values are counts of observation records where that casing was seen.
     * May be null for legacy entries created before casing tracking.
     */
    @Field("casingcounts")
    private Map<String, Long> casingCounts;

    /**
     * User-selected canonical casing for schema export.
     * Must be one of the keys in {@code casingCounts} if set.
     * Scoped per-entry (per schema variant), not shared across entries with the same fieldPath.
     * Null means no canonical casing selected yet.
     */
    @Field("canonicalcasing")
    private String canonicalCasing;
}
