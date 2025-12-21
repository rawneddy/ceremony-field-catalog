package com.ceremony.catalog.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "System health and status information")
public record SystemHealthDTO(
    @Schema(description = "Overall system status", example = "UP")
    String status,

    @Schema(description = "Application uptime in human-readable format", example = "2d 5h 30m")
    String uptime,

    @Schema(description = "Application uptime in milliseconds", example = "191400000")
    long uptimeMillis,

    @Schema(description = "MongoDB connection status", example = "UP")
    String mongoStatus,

    @Schema(description = "JVM memory usage information")
    MemoryInfo memory,

    @Schema(description = "Timestamp of this health check")
    Instant timestamp
) {
    @Schema(description = "JVM memory usage details")
    public record MemoryInfo(
        @Schema(description = "Used heap memory in MB", example = "256")
        long usedMb,

        @Schema(description = "Maximum heap memory in MB", example = "512")
        long maxMb,

        @Schema(description = "Memory usage percentage", example = "50.0")
        double usagePercent
    ) {}
}
