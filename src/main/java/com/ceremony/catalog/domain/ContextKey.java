package com.ceremony.catalog.domain;

import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.stream.Collectors;

public record ContextKey(
    String contextId,
    Map<String, String> metadata
) {
    public ContextKey {
        // Compact constructor for validation
        Objects.requireNonNull(contextId, "contextId cannot be null");
        
        // Sort metadata for consistent key generation
        metadata = metadata == null ? Map.of() : new TreeMap<>(metadata);
    }
    
    @Override
    public String toString() {
        String metadataString = metadata.entrySet().stream()
            .map(entry -> escape(entry.getKey()) + "=" + escape(safe(entry.getValue())))
            .collect(Collectors.joining("&"));
            
        return String.join("§",
            escape(contextId),
            escape(metadataString)
        );
    }
    
    private static String safe(String value) {
        return value == null ? "" : value;
    }
    
    private static String escape(String value) {
        return value.replace("§", "§§").replace("=", "==").replace("&", "&&");
    }
}