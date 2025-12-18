package com.ceremony.catalog.service;

import com.ceremony.catalog.config.CatalogProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

@Service
@Slf4j
@RequiredArgsConstructor
public class InputValidationService {
    
    private final CatalogProperties catalogProperties;
    
    // Pattern for control characters that should be removed
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\x00-\\x1F\\x7F]");
    
    // Basic validation patterns
    private static final Pattern VALID_CONTEXT_ID = Pattern.compile("^[a-zA-Z0-9._-]+$");
    private static final Pattern VALID_METADATA_KEY = Pattern.compile("^[a-zA-Z0-9._-]+$");
    
    /**
     * Validates and cleans field path expressions.
     * Accepts both full XPath-style paths (starting with /) and plain text for contains searches.
     * Returns lowercase for case-insensitive matching.
     */
    public String validateAndCleanFieldPath(String fieldPath) {
        if (!StringUtils.hasText(fieldPath)) {
            return fieldPath;
        }

        String cleaned = fieldPath.trim();

        int maxLength = catalogProperties.getValidation().getMaxFieldPathLength();
        if (cleaned.length() > maxLength) {
            throw new IllegalArgumentException("Field path too long (max " + maxLength + " characters)");
        }

        // Remove control characters only
        cleaned = CONTROL_CHARS.matcher(cleaned).replaceAll("");

        // Basic field path format validation - allow both full paths and plain text search terms
        if (!isValidFieldPathFormat(cleaned)) {
            throw new IllegalArgumentException("Invalid field path format: " + cleaned);
        }

        return cleaned.toLowerCase();
    }
    
    /**
     * Validates and cleans context ID.
     * Returns lowercase for case-insensitive matching.
     */
    public String validateAndCleanContextId(String contextId) {
        if (!StringUtils.hasText(contextId)) {
            return contextId;
        }

        String cleaned = contextId.trim();

        int maxLength = catalogProperties.getValidation().getMaxContextIdLength();
        if (cleaned.length() > maxLength) {
            throw new IllegalArgumentException("Context ID too long (max " + maxLength + " characters)");
        }

        // Remove control characters only
        cleaned = CONTROL_CHARS.matcher(cleaned).replaceAll("");

        // Validate format
        if (!VALID_CONTEXT_ID.matcher(cleaned).matches()) {
            throw new IllegalArgumentException("Invalid context ID format. Only alphanumeric, dots, underscores, and hyphens allowed: " + contextId);
        }

        return cleaned.toLowerCase();
    }
    
    /**
     * Validates and cleans metadata map
     */
    public Map<String, String> validateAndCleanMetadata(Map<String, String> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return metadata;
        }
        
        Map<String, String> cleaned = new HashMap<>();
        
        for (Map.Entry<String, String> entry : metadata.entrySet()) {
            String key = validateAndCleanMetadataKey(entry.getKey());
            String value = validateAndCleanMetadataValue(entry.getValue());
            
            if (StringUtils.hasText(key) && value != null) {
                cleaned.put(key, value);
            }
        }
        
        return cleaned;
    }
    
    private String validateAndCleanMetadataKey(String key) {
        if (!StringUtils.hasText(key)) {
            throw new IllegalArgumentException("Metadata key cannot be empty");
        }

        String cleaned = key.trim();

        int maxLength = catalogProperties.getValidation().getMaxMetadataKeyLength();
        if (cleaned.length() > maxLength) {
            throw new IllegalArgumentException("Metadata key too long (max " + maxLength + " characters): " + key);
        }

        // Remove control characters only
        cleaned = CONTROL_CHARS.matcher(cleaned).replaceAll("");

        // Validate format
        if (!VALID_METADATA_KEY.matcher(cleaned).matches()) {
            throw new IllegalArgumentException("Invalid metadata key format. Only alphanumeric, dots, underscores, and hyphens allowed: " + key);
        }

        return cleaned.toLowerCase();
    }

    private String validateAndCleanMetadataValue(String value) {
        if (value == null) {
            return null;
        }

        if (value.trim().isEmpty()) {
            return value;
        }

        String cleaned = value.trim();

        int maxLength = catalogProperties.getValidation().getMaxMetadataValueLength();
        if (cleaned.length() > maxLength) {
            throw new IllegalArgumentException("Metadata value too long (max " + maxLength + " characters)");
        }

        // Remove control characters only - preserve everything else including spaces, special chars
        cleaned = CONTROL_CHARS.matcher(cleaned).replaceAll("");

        return cleaned.toLowerCase();
    }
    
    private boolean isValidFieldPathFormat(String fieldPath) {
        if (fieldPath.isEmpty()) {
            return false;
        }

        // If it starts with /, validate as XPath-style path
        if (fieldPath.startsWith("/")) {
            // Should contain valid element names (letters, numbers, underscores, hyphens)
            return fieldPath.matches(".*[a-zA-Z_][a-zA-Z0-9_-]*.*");
        }

        // Otherwise, treat as plain text search term
        // Allow alphanumeric chars, underscores, hyphens, dots, and slashes
        // This supports searches like "Amount", "FeeCode", "Account.Amount", etc.
        return fieldPath.matches("^[a-zA-Z0-9_./@ -]+$");
    }
}