package com.ceremony.catalog.config;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Data
@Component
@Validated
@ConfigurationProperties(prefix = "app.catalog")
@Schema(description = "Catalog application configuration properties")
public class CatalogProperties {

    @Schema(description = "Database configuration settings")
    private final Database database = new Database();

    @Schema(description = "Batch processing configuration")
    private final Batch batch = new Batch();

    @Schema(description = "Search and query configuration")
    private final Search search = new Search();

    @Schema(description = "Input validation configuration")
    private final Validation validation = new Validation();

    @Schema(description = "Cache configuration")
    private final Cache cache = new Cache();

    @Schema(description = "Performance monitoring configuration")
    private final Performance performance = new Performance();

    @Data
    public static class Database {
        @Schema(description = "MongoDB connection URI", example = "mongodb://localhost:27017/ceremony_catalog")
        @NotBlank(message = "MongoDB URI cannot be blank")
        private String mongoUri = "mongodb://localhost:27017/ceremony_catalog";

        @Schema(description = "Database connection timeout in seconds", example = "30")
        @Min(value = 1, message = "Connection timeout must be at least 1 second")
        @Max(value = 300, message = "Connection timeout cannot exceed 5 minutes")
        private int connectionTimeoutSeconds = 30;

        @Schema(description = "Maximum number of database connections", example = "100")
        @Min(value = 1, message = "Max connections must be at least 1")
        @Max(value = 1000, message = "Max connections cannot exceed 1000")
        private int maxConnections = 100;
    }

    @Data
    public static class Batch {
        @Schema(description = "Maximum number of observations to process in a single batch", example = "1000")
        @Min(value = 1, message = "Batch size must be at least 1")
        @Max(value = 10000, message = "Batch size cannot exceed 10000")
        private int maxSize = 1000;

        @Schema(description = "Timeout for batch operations", example = "PT5M")
        private Duration timeout = Duration.ofMinutes(5);

        @Schema(description = "Enable parallel processing of batch operations", example = "true")
        private boolean parallelProcessing = true;
    }

    @Data
    public static class Search {
        @Schema(description = "Maximum number of results to return in a single search", example = "10000")
        @Min(value = 1, message = "Max results must be at least 1")
        @Max(value = 100000, message = "Max results cannot exceed 100000")
        private int maxResults = 10000;

        @Schema(description = "Default page size for search results", example = "50")
        @Min(value = 1, message = "Default page size must be at least 1")
        @Max(value = 1000, message = "Default page size cannot exceed 1000")
        private int defaultPageSize = 50;

        @Schema(description = "Maximum page size allowed for search requests", example = "1000")
        @Min(value = 1, message = "Max page size must be at least 1")
        @Max(value = 5000, message = "Max page size cannot exceed 5000")
        private int maxPageSize = 1000;

        @Schema(description = "Timeout for search operations", example = "PT30S")
        private Duration timeout = Duration.ofSeconds(30);
    }

    @Data
    public static class Validation {
        @Schema(description = "Maximum length for field path expressions", example = "1000")
        @Min(value = 10, message = "Max field path length must be at least 10")
        @Max(value = 10000, message = "Max field path length cannot exceed 10000")
        private int maxFieldPathLength = 1000;

        @Schema(description = "Maximum length for context IDs", example = "100")
        @Min(value = 1, message = "Max context ID length must be at least 1")
        @Max(value = 500, message = "Max context ID length cannot exceed 500")
        private int maxContextIdLength = 100;

        @Schema(description = "Maximum length for metadata keys", example = "100")
        @Min(value = 1, message = "Max metadata key length must be at least 1")
        @Max(value = 200, message = "Max metadata key length cannot exceed 200")
        private int maxMetadataKeyLength = 100;

        @Schema(description = "Maximum length for metadata values", example = "500")
        @Min(value = 1, message = "Max metadata value length must be at least 1")
        @Max(value = 2000, message = "Max metadata value length cannot exceed 2000")
        private int maxMetadataValueLength = 500;
    }

    @Data
    public static class Cache {
        @Schema(description = "Enable caching for search results", example = "true")
        private boolean enabled = true;

        @Schema(description = "Time to live for cached search results", example = "PT15M")
        private Duration ttl = Duration.ofMinutes(15);

        @Schema(description = "Maximum number of cached search results", example = "1000")
        @Min(value = 0, message = "Max cache size cannot be negative")
        @Max(value = 100000, message = "Max cache size cannot exceed 100000")
        private int maxSize = 1000;
    }

    @Data
    public static class Performance {
        @Schema(description = "Threshold in milliseconds for logging slow queries", example = "100")
        @Min(value = 1, message = "Slow query threshold must be at least 1ms")
        @Max(value = 10000, message = "Slow query threshold cannot exceed 10000ms")
        private int slowQueryThresholdMs = 100;

        @Schema(description = "Enable query performance logging", example = "false")
        private boolean enableQueryLogging = false;

        @Schema(description = "Maximum batch size for bulk operations", example = "1000")
        @Min(value = 1, message = "Max batch size must be at least 1")
        @Max(value = 10000, message = "Max batch size cannot exceed 10000")
        private int maxBatchSize = 1000;

        @Schema(description = "Enable performance monitoring metrics", example = "true")
        private boolean enableMetrics = true;
    }
}