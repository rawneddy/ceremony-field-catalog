package com.ceremony.catalog.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

/**
 * Service for recording custom application metrics using Micrometer.
 * Provides counters, timers, and gauges for catalog operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ObservabilityService {

    private final MeterRegistry registry;

    // Counters
    private Counter observationsSubmittedCounter;
    private Counter observationBatchesCounter;
    private Counter searchesExecutedCounter;
    private Counter contextsCreatedCounter;

    // Timers
    private Timer searchLatencyTimer;
    private Timer observationMergeTimer;
    private Timer mongoQueryTimer;

    // Atomic values for gauges
    private final AtomicLong activeContextsCount = new AtomicLong(0);
    private final AtomicLong totalFieldsCount = new AtomicLong(0);

    @PostConstruct
    void initMetrics() {
        // Observation metrics
        observationsSubmittedCounter = Counter.builder("catalog.observations.submitted")
            .description("Total number of field observations submitted")
            .tag("type", "observation")
            .register(registry);

        observationBatchesCounter = Counter.builder("catalog.observations.batches")
            .description("Total number of observation batches processed")
            .tag("type", "batch")
            .register(registry);

        // Search metrics
        searchesExecutedCounter = Counter.builder("catalog.searches.executed")
            .description("Total number of search queries executed")
            .tag("type", "search")
            .register(registry);

        searchLatencyTimer = Timer.builder("catalog.searches.latency")
            .description("Search query execution time")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);

        // Context metrics
        contextsCreatedCounter = Counter.builder("catalog.contexts.created")
            .description("Total number of contexts created")
            .tag("type", "context")
            .register(registry);

        // Merge timer
        observationMergeTimer = Timer.builder("catalog.observations.merge.latency")
            .description("Time to merge observation batches")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);

        // MongoDB query timer
        mongoQueryTimer = Timer.builder("catalog.mongo.query.latency")
            .description("MongoDB query execution time")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);

        // Gauges for current state
        Gauge.builder("catalog.contexts.active", activeContextsCount, AtomicLong::get)
            .description("Current number of active contexts")
            .register(registry);

        Gauge.builder("catalog.fields.total", totalFieldsCount, AtomicLong::get)
            .description("Total number of catalog fields")
            .register(registry);

        log.info("Observability metrics initialized");
    }

    // ==================== Counter Methods ====================

    /**
     * Record that observations were submitted.
     * @param count Number of observations in the batch
     */
    public void recordObservationsSubmitted(int count) {
        observationsSubmittedCounter.increment(count);
        observationBatchesCounter.increment();
    }

    /**
     * Record that a search was executed.
     */
    public void recordSearchExecuted() {
        searchesExecutedCounter.increment();
    }

    /**
     * Record that a context was created.
     */
    public void recordContextCreated() {
        contextsCreatedCounter.increment();
    }

    // ==================== Timer Methods ====================

    /**
     * Start a timer for search latency measurement.
     * @return Timer.Sample to stop when search completes
     */
    public Timer.Sample startSearchTimer() {
        return Timer.start(registry);
    }

    /**
     * Stop the search timer and record the duration.
     * @param sample The sample from startSearchTimer()
     */
    public void stopSearchTimer(Timer.Sample sample) {
        sample.stop(searchLatencyTimer);
    }

    /**
     * Start a timer for observation merge latency.
     * @return Timer.Sample to stop when merge completes
     */
    public Timer.Sample startMergeTimer() {
        return Timer.start(registry);
    }

    /**
     * Stop the merge timer and record the duration.
     * @param sample The sample from startMergeTimer()
     */
    public void stopMergeTimer(Timer.Sample sample) {
        sample.stop(observationMergeTimer);
    }

    /**
     * Start a timer for MongoDB query latency.
     * @return Timer.Sample to stop when query completes
     */
    public Timer.Sample startMongoQueryTimer() {
        return Timer.start(registry);
    }

    /**
     * Stop the MongoDB query timer and record the duration.
     * @param sample The sample from startMongoQueryTimer()
     */
    public void stopMongoQueryTimer(Timer.Sample sample) {
        sample.stop(mongoQueryTimer);
    }

    /**
     * Execute a timed operation and record the duration.
     * @param timer The timer to record to
     * @param operation The operation to execute
     * @return The result of the operation
     */
    public <T> T timed(Timer timer, Supplier<T> operation) {
        return timer.record(operation);
    }

    // ==================== Gauge Update Methods ====================

    /**
     * Update the active contexts gauge.
     * @param count Current number of active contexts
     */
    public void updateActiveContextsCount(long count) {
        activeContextsCount.set(count);
    }

    /**
     * Update the total fields gauge.
     * @param count Current total number of fields
     */
    public void updateTotalFieldsCount(long count) {
        totalFieldsCount.set(count);
    }

    // ==================== Metric Accessors (for UI) ====================

    /**
     * Get the total number of observations submitted.
     */
    public double getObservationsSubmittedTotal() {
        return observationsSubmittedCounter.count();
    }

    /**
     * Get the total number of batches processed.
     */
    public double getBatchesProcessedTotal() {
        return observationBatchesCounter.count();
    }

    /**
     * Get the total number of searches executed.
     */
    public double getSearchesExecutedTotal() {
        return searchesExecutedCounter.count();
    }

    /**
     * Get the total number of contexts created.
     */
    public double getContextsCreatedTotal() {
        return contextsCreatedCounter.count();
    }

    /**
     * Get the current active contexts count.
     */
    public long getActiveContextsCount() {
        return activeContextsCount.get();
    }

    /**
     * Get the current total fields count.
     */
    public long getTotalFieldsCount() {
        return totalFieldsCount.get();
    }

    /**
     * Get search latency statistics.
     */
    public Timer getSearchLatencyTimer() {
        return searchLatencyTimer;
    }

    /**
     * Get merge latency statistics.
     */
    public Timer getMergeLatencyTimer() {
        return observationMergeTimer;
    }

    /**
     * Get MongoDB query latency statistics.
     */
    public Timer getMongoQueryTimer() {
        return mongoQueryTimer;
    }
}
