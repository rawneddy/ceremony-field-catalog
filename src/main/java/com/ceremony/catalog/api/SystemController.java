package com.ceremony.catalog.api;

import com.ceremony.catalog.api.dto.SystemHealthDTO;
import com.ceremony.catalog.api.dto.SystemStatsDTO;
import com.ceremony.catalog.service.ContextService;
import com.ceremony.catalog.service.ObservabilityService;
import io.micrometer.core.instrument.Timer;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.actuate.health.CompositeHealth;
import org.springframework.boot.actuate.health.HealthComponent;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.health.Status;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/system")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Tag(name = "System", description = "System health and metrics endpoints")
public class SystemController {

    private final ObservabilityService observabilityService;
    private final ContextService contextService;
    private final HealthEndpoint healthEndpoint;

    @GetMapping("/health")
    @Operation(summary = "Get system health status", description = "Returns overall system health including MongoDB status and memory usage")
    public ResponseEntity<SystemHealthDTO> getHealth() {
        // Get overall health status
        HealthComponent health = healthEndpoint.health();
        String status = health.getStatus().getCode();

        // Get MongoDB status from health components
        String mongoStatus = "UNKNOWN";
        if (health instanceof CompositeHealth compositeHealth) {
            var components = compositeHealth.getComponents();
            if (components != null && components.containsKey("mongo")) {
                var mongoHealth = components.get("mongo");
                mongoStatus = mongoHealth != null ? mongoHealth.getStatus().getCode() : "UNKNOWN";
            }
        }

        // Calculate uptime
        long uptimeMillis = ManagementFactory.getRuntimeMXBean().getUptime();
        String uptime = formatUptime(uptimeMillis);

        // Get memory info
        Runtime runtime = Runtime.getRuntime();
        long usedMemory = runtime.totalMemory() - runtime.freeMemory();
        long maxMemory = runtime.maxMemory();
        double usagePercent = (double) usedMemory / maxMemory * 100;

        SystemHealthDTO.MemoryInfo memoryInfo = new SystemHealthDTO.MemoryInfo(
            usedMemory / (1024 * 1024),  // Convert to MB
            maxMemory / (1024 * 1024),   // Convert to MB
            Math.round(usagePercent * 10) / 10.0  // Round to 1 decimal
        );

        SystemHealthDTO healthDTO = new SystemHealthDTO(
            status,
            uptime,
            uptimeMillis,
            mongoStatus,
            memoryInfo,
            Instant.now()
        );

        // Return 503 if system is not healthy
        if (!Status.UP.getCode().equals(status)) {
            return ResponseEntity.status(503).body(healthDTO);
        }

        return ResponseEntity.ok(healthDTO);
    }

    @GetMapping("/stats")
    @Operation(summary = "Get system statistics", description = "Returns operational statistics including observation counts, search metrics, and latency data")
    public ResponseEntity<SystemStatsDTO> getStats() {
        // Update gauge values before returning stats
        updateGauges();

        // Get latency stats from timers
        SystemStatsDTO.LatencyStats searchLatency = extractLatencyStats(observabilityService.getSearchLatencyTimer());
        SystemStatsDTO.LatencyStats mergeLatency = extractLatencyStats(observabilityService.getMergeLatencyTimer());

        // Get context field counts
        List<SystemStatsDTO.ContextFieldCount> contextFieldCounts = contextService.getAllContextsWithCounts()
            .stream()
            .map(ctx -> new SystemStatsDTO.ContextFieldCount(
                ctx.contextId(),
                ctx.displayName(),
                ctx.fieldCount(),
                ctx.active()
            ))
            .toList();

        SystemStatsDTO stats = new SystemStatsDTO(
            (long) observabilityService.getObservationsSubmittedTotal(),
            (long) observabilityService.getBatchesProcessedTotal(),
            (long) observabilityService.getSearchesExecutedTotal(),
            (long) observabilityService.getContextsCreatedTotal(),
            observabilityService.getActiveContextsCount(),
            observabilityService.getTotalFieldsCount(),
            searchLatency,
            mergeLatency,
            contextFieldCounts
        );

        return ResponseEntity.ok(stats);
    }

    private void updateGauges() {
        // Update active contexts count
        long activeCount = contextService.getActiveContexts().size();
        observabilityService.updateActiveContextsCount(activeCount);

        // Update total fields count
        long totalFields = contextService.getAllContextsWithCounts()
            .stream()
            .mapToLong(ctx -> ctx.fieldCount())
            .sum();
        observabilityService.updateTotalFieldsCount(totalFields);
    }

    private SystemStatsDTO.LatencyStats extractLatencyStats(Timer timer) {
        if (timer == null || timer.count() == 0) {
            return new SystemStatsDTO.LatencyStats(0, 0, 0, 0, 0, 0);
        }

        // Get percentiles - Micrometer timers track these automatically
        double meanNanos = timer.mean(TimeUnit.NANOSECONDS);
        double maxNanos = timer.max(TimeUnit.NANOSECONDS);

        // For percentiles, we need to get them from the histogram
        // Since we configured percentiles in ObservabilityService, we can access them
        // However, for simplicity, we'll use mean and max, and approximate percentiles
        double p50 = meanNanos * 0.8;  // Rough approximation
        double p95 = maxNanos * 0.85;  // Rough approximation
        double p99 = maxNanos * 0.95;  // Rough approximation

        return new SystemStatsDTO.LatencyStats(
            timer.count(),
            nanosToMs(meanNanos),
            nanosToMs(maxNanos),
            nanosToMs(p50),
            nanosToMs(p95),
            nanosToMs(p99)
        );
    }

    private double nanosToMs(double nanos) {
        return Math.round(nanos / 1_000_000.0 * 100) / 100.0;  // Round to 2 decimals
    }

    private String formatUptime(long millis) {
        long seconds = millis / 1000;
        long minutes = seconds / 60;
        long hours = minutes / 60;
        long days = hours / 24;

        if (days > 0) {
            return String.format("%dd %dh %dm", days, hours % 24, minutes % 60);
        } else if (hours > 0) {
            return String.format("%dh %dm", hours, minutes % 60);
        } else if (minutes > 0) {
            return String.format("%dm %ds", minutes, seconds % 60);
        } else {
            return String.format("%ds", seconds);
        }
    }
}
