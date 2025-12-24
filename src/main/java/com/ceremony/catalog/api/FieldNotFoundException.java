package com.ceremony.catalog.api;

/**
 * Thrown when a requested field entry is not found in the catalog.
 */
public class FieldNotFoundException extends RuntimeException {
    public FieldNotFoundException(String fieldId) {
        super("Field not found: " + fieldId);
    }
}
