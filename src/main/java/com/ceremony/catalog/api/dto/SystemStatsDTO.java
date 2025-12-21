package com.ceremony.catalog.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "System statistics and metrics")
public record SystemStatsDTO(
    @Schema(description = "Total observations submitted since startup", example = "12450")
    long observationsSubmitted,

    @Schema(description = "Total observation batches processed since startup", example = "245")
    long batchesProcessed,

    @Schema(description = "Total search queries executed since startup", example = "892")
    long searchesExecuted,

    @Schema(description = "Total contexts created since startup", example = "5")
    long contextsCreated,

    @Schema(description = "Current number of active contexts", example = "3")
    long activeContexts,

    @Schema(description = "Total number of catalog fields", example = "45231")
    long totalFields,

    @Schema(description = "Search latency statistics")
    LatencyStats searchLatency,

    @Schema(description = "Observation merge latency statistics")
    LatencyStats mergeLatency,

    @Schema(description = "Field counts per context")
    List<ContextFieldCount> contextFieldCounts
) {
    @Schema(description = "Latency statistics in milliseconds")
    public record LatencyStats(
        @Schema(description = "Number of operations measured", example = "100")
        long count,

        @Schema(description = "Mean latency in milliseconds", example = "45.5")
        double meanMs,

        @Schema(description = "Maximum latency in milliseconds", example = "250.0")
        double maxMs,

        @Schema(description = "50th percentile (median) latency in milliseconds", example = "35.0")
        double p50Ms,

        @Schema(description = "95th percentile latency in milliseconds", example = "120.0")
        double p95Ms,

        @Schema(description = "99th percentile latency in milliseconds", example = "200.0")
        double p99Ms
    ) {}

    @Schema(description = "Field count for a context")
    public record ContextFieldCount(
        @Schema(description = "Context ID", example = "deposits")
        String contextId,

        @Schema(description = "Display name of the context", example = "Deposits")
        String displayName,

        @Schema(description = "Number of fields in this context", example = "12450")
        long fieldCount,

        @Schema(description = "Whether the context is active", example = "true")
        boolean active
    ) {}
}
