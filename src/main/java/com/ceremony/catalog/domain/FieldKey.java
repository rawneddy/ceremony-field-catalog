package com.ceremony.catalog.domain;

import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.stream.Collectors;

public record FieldKey(
    String contextId,
    Map<String, String> metadata,
    String fieldPath
) {
    public FieldKey {
        // Compact constructor for validation
        Objects.requireNonNull(contextId, "contextId cannot be null");
        Objects.requireNonNull(fieldPath, "fieldPath cannot be null");
        
        // Sort metadata for consistent key generation and normalize case for case-insensitive comparison
        metadata = metadata == null ? Map.of() : 
            metadata.entrySet().stream()
                .collect(TreeMap::new, 
                    (map, entry) -> map.put(
                        normalizeCase(entry.getKey()), 
                        normalizeCase(entry.getValue())
                    ), 
                    TreeMap::putAll);
    }
    
    @Override
    public String toString() {
        // Create a consistent string representation for hashing
        String metadataString = metadata.entrySet().stream()
            .map(entry -> entry.getKey() + "=" + safe(entry.getValue()))
            .collect(Collectors.joining("&"));
            
        String keyString = String.join("|", contextId, metadataString, fieldPath);
        
        // Generate a consistent hash-based ID (avoid Math.abs collision on MIN_VALUE)
        int hash = keyString.hashCode();
        return "field_" + (hash == Integer.MIN_VALUE ? 0 : Math.abs(hash));
    }
    
    private static String safe(String value) {
        return value == null ? "" : value;
    }
    
    private static String normalizeCase(String value) {
        return value == null ? null : value.toLowerCase();
    }
}