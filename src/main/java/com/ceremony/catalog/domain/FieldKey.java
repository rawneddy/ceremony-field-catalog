package com.ceremony.catalog.domain;

import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.stream.Collectors;

public record FieldKey(
    String contextId,
    Map<String, String> metadata,
    String dataType,
    String xpath
) {
    public FieldKey {
        // Compact constructor for validation
        Objects.requireNonNull(contextId, "contextId cannot be null");
        Objects.requireNonNull(xpath, "xpath cannot be null");
        Objects.requireNonNull(dataType, "dataType cannot be null");
        
        // Sort metadata for consistent key generation
        metadata = metadata == null ? Map.of() : new TreeMap<>(metadata);
    }
    
    @Override
    public String toString() {
        // Use a delimiter that's unlikely to appear in field values
        String metadataString = metadata.entrySet().stream()
            .map(entry -> escape(entry.getKey()) + "=" + escape(safe(entry.getValue())))
            .collect(Collectors.joining("&"));
            
        return String.join("§",
            escape(contextId),
            escape(metadataString),
            escape(dataType),
            escape(xpath)
        );
    }
    
    private static String safe(String value) {
        return value == null ? "" : value;
    }
    
    private static String escape(String value) {
        return value.replace("§", "§§").replace("=", "==").replace("&", "&&");
    }
}