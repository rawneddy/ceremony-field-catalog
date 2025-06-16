package com.ceremony.catalog.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

@Service
@Slf4j
public class InputValidationService {
    
    // Pattern for control characters that should be removed
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\x00-\\x1F\\x7F]");
    
    // Maximum length constraints
    private static final int MAX_XPATH_LENGTH = 1000;
    private static final int MAX_METADATA_KEY_LENGTH = 100;
    private static final int MAX_METADATA_VALUE_LENGTH = 500;
    private static final int MAX_CONTEXT_ID_LENGTH = 100;
    
    // Basic validation patterns
    private static final Pattern VALID_CONTEXT_ID = Pattern.compile("^[a-zA-Z0-9._-]+$");
    private static final Pattern VALID_METADATA_KEY = Pattern.compile("^[a-zA-Z0-9._-]+$");
    
    /**
     * Validates and cleans XPath expressions
     */
    public String validateAndCleanXPath(String xpath) {
        if (!StringUtils.hasText(xpath)) {
            return xpath;
        }
        
        String cleaned = xpath.trim();
        
        if (cleaned.length() > MAX_XPATH_LENGTH) {
            throw new IllegalArgumentException("XPath too long (max " + MAX_XPATH_LENGTH + " characters)");
        }
        
        // Remove control characters only
        cleaned = CONTROL_CHARS.matcher(cleaned).replaceAll("");
        
        // Basic XPath format validation
        if (!isValidXPathFormat(cleaned)) {
            throw new IllegalArgumentException("Invalid XPath format: " + cleaned);
        }
        
        return cleaned;
    }
    
    /**
     * Validates and cleans context ID
     */
    public String validateAndCleanContextId(String contextId) {
        if (!StringUtils.hasText(contextId)) {
            return contextId;
        }
        
        String cleaned = contextId.trim();
        
        if (cleaned.length() > MAX_CONTEXT_ID_LENGTH) {
            throw new IllegalArgumentException("Context ID too long (max " + MAX_CONTEXT_ID_LENGTH + " characters)");
        }
        
        // Remove control characters only
        cleaned = CONTROL_CHARS.matcher(cleaned).replaceAll("");
        
        // Validate format
        if (!VALID_CONTEXT_ID.matcher(cleaned).matches()) {
            throw new IllegalArgumentException("Invalid context ID format. Only alphanumeric, dots, underscores, and hyphens allowed: " + contextId);
        }
        
        return cleaned;
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
        
        if (cleaned.length() > MAX_METADATA_KEY_LENGTH) {
            throw new IllegalArgumentException("Metadata key too long (max " + MAX_METADATA_KEY_LENGTH + " characters): " + key);
        }
        
        // Remove control characters only
        cleaned = CONTROL_CHARS.matcher(cleaned).replaceAll("");
        
        // Validate format
        if (!VALID_METADATA_KEY.matcher(cleaned).matches()) {
            throw new IllegalArgumentException("Invalid metadata key format. Only alphanumeric, dots, underscores, and hyphens allowed: " + key);
        }
        
        return cleaned;
    }
    
    private String validateAndCleanMetadataValue(String value) {
        if (value == null) {
            return null;
        }
        
        if (value.trim().isEmpty()) {
            return value;
        }
        
        String cleaned = value.trim();
        
        if (cleaned.length() > MAX_METADATA_VALUE_LENGTH) {
            throw new IllegalArgumentException("Metadata value too long (max " + MAX_METADATA_VALUE_LENGTH + " characters)");
        }
        
        // Remove control characters only - preserve everything else including spaces, special chars
        cleaned = CONTROL_CHARS.matcher(cleaned).replaceAll("");
        
        return cleaned;
    }
    
    private boolean isValidXPathFormat(String xpath) {
        if (xpath.isEmpty()) {
            return false;
        }
        
        // Very basic XPath validation - should contain typical XPath patterns
        return xpath.startsWith("/") || 
               xpath.contains("[@") ||
               xpath.contains("//") ||
               xpath.matches(".*[a-zA-Z_][a-zA-Z0-9_-]*.*"); // Contains element names
    }
}