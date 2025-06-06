package com.ceremony.catalog.domain;

import java.util.Objects;

public record FieldKey(
    String pathType,
    String formCode,
    String formVersion,
    String action,
    String productCode,
    String productSubCode,
    String loanProductCode,
    String dataType,
    String xpath
) {
    public FieldKey {
        // Compact constructor for validation
        Objects.requireNonNull(pathType, "pathType cannot be null");
        Objects.requireNonNull(xpath, "xpath cannot be null");
        Objects.requireNonNull(dataType, "dataType cannot be null");
    }
    
    @Override
    public String toString() {
        // Use a delimiter that's unlikely to appear in field values
        // and escape any occurrences of it
        return String.join("§",
            escape(safe(pathType)), escape(safe(formCode)), escape(safe(formVersion)),
            escape(safe(action)), escape(safe(productCode)), escape(safe(productSubCode)),
            escape(safe(loanProductCode)), escape(safe(dataType)), escape(safe(xpath))
        );
    }
    
    private static String safe(String value) {
        return value == null ? "" : value;
    }
    
    private static String escape(String value) {
        return value.replace("§", "§§");
    }
}