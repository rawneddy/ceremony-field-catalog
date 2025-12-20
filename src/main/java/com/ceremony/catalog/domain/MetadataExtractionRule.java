package com.ceremony.catalog.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Defines extraction and validation rules for a metadata field.
 * Used to automatically extract metadata values from XML during smart uploads.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetadataExtractionRule {

    /**
     * Ordered list of XPath expressions to try for extracting the metadata value.
     * The first XPath that returns a non-empty value will be used.
     * Example: ["/ceremony/productCode", "/header/product", "/altPath/code"]
     */
    private List<String> xpaths;

    /**
     * Optional regex pattern for validating extracted values.
     * If provided, extracted values must match this pattern to be considered valid.
     * Example: "^[A-Z]{3}$" for a 3-letter uppercase code.
     * If null or empty, no validation is performed.
     */
    private String validationRegex;
}
