package com.ceremony.catalog.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.Map;

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

    private Map<String, String> metadata;

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

    @Field("casingcounts")
    private Map<String, Long> casingCounts;

    @Field("canonicalcasing")
    private String canonicalCasing;
}
