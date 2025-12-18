package com.ceremony.catalog.api;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException e) {
        log.warn("Illegal argument: {}", e.getMessage());
        Map<String, Object> errorResponse = Map.of(
            "message", e.getMessage(),
            "status", 400,
            "timestamp", Instant.now(),
            "error", "Bad Request"
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException e) {
        log.warn("Validation error: {}", e.getMessage());
        
        List<String> errors = e.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .collect(Collectors.toList());
        
        Map<String, Object> errorResponse = Map.of(
            "message", "Validation failed",
            "errors", errors,
            "status", 400,
            "timestamp", Instant.now(),
            "error", "Validation Error"
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<Map<String, Object>> handleHandlerMethodValidation(HandlerMethodValidationException e) {
        log.warn("Handler method validation error: {}", e.getMessage());

        List<String> errors = new ArrayList<>();
        e.getParameterValidationResults().forEach(result -> {
            result.getResolvableErrors().forEach(error -> {
                String field = "";
                String[] codes = error.getCodes();
                if (codes != null && codes.length > 0) {
                    // Extract field name from the code (e.g., "fieldPath" from "NotBlank.fieldPath")
                    String code = codes[0];
                    if (code != null && code.contains(".")) {
                        field = code.substring(code.lastIndexOf('.') + 1) + ": ";
                    }
                }
                errors.add(field + error.getDefaultMessage());
            });
        });

        Map<String, Object> errorResponse = Map.of(
            "message", "Validation failed",
            "errors", errors,
            "status", 400,
            "timestamp", Instant.now(),
            "error", "Validation Error"
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(ConstraintViolationException e) {
        log.warn("Constraint violation: {}", e.getMessage());
        
        List<String> errors = e.getConstraintViolations()
            .stream()
            .map(ConstraintViolation::getMessage)
            .collect(Collectors.toList());
        
        Map<String, Object> errorResponse = Map.of(
            "message", "Constraint violation",
            "errors", errors,
            "status", 400,
            "timestamp", Instant.now(),
            "error", "Validation Error"
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        log.warn("Type mismatch: {}", e.getMessage());

        Class<?> requiredType = e.getRequiredType();
        String typeName = requiredType != null ? requiredType.getSimpleName() : "unknown";
        String message = String.format("Invalid value '%s' for parameter '%s'. Expected type: %s",
            e.getValue(), e.getName(), typeName);
        
        Map<String, Object> errorResponse = Map.of(
            "message", message,
            "status", 400,
            "timestamp", Instant.now(),
            "error", "Type Mismatch"
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleMessageNotReadable(HttpMessageNotReadableException e) {
        log.warn("Message not readable: {}", e.getMessage());
        
        Map<String, Object> errorResponse = Map.of(
            "message", "Invalid request body format",
            "status", 400,
            "timestamp", Instant.now(),
            "error", "Malformed JSON"
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> handleDataAccess(DataAccessException e) {
        log.error("Database error", e);
        
        Map<String, Object> errorResponse = Map.of(
            "message", "Database operation failed",
            "status", 500,
            "timestamp", Instant.now(),
            "error", "Internal Server Error"
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception e) {
        log.error("Unexpected error", e);
        
        Map<String, Object> errorResponse = Map.of(
            "message", "An unexpected error occurred",
            "status", 500,
            "timestamp", Instant.now(),
            "error", "Internal Server Error"
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
}