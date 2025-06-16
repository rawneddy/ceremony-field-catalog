package com.ceremony.catalog.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

@Schema(description = "Standard error response format")
public record ErrorResponse(
    @Schema(description = "Error message describing what went wrong", example = "Required metadata field missing: productCode")
    String message,
    
    @Schema(description = "HTTP status code", example = "400")
    int status,
    
    @Schema(description = "Timestamp when the error occurred", example = "2025-06-16T04:35:36.668959Z")
    Instant timestamp,
    
    @Schema(description = "Error type classification", example = "Bad Request")
    String error,
    
    @Schema(description = "Detailed validation errors (when applicable)", 
           example = "[\"page: Page must be non-negative\", \"size: Size must be at least 1\"]")
    List<String> errors
) {
    // Constructor for simple errors without detailed validation errors
    public ErrorResponse(String message, int status, Instant timestamp, String error) {
        this(message, status, timestamp, error, null);
    }
}