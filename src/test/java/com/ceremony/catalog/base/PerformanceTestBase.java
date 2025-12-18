package com.ceremony.catalog.base;

import org.springframework.test.context.TestPropertySource;

import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Base class for performance tests that validates performance requirements
 * and provides utilities for measuring execution time.
 * 
 * Extends IntegrationTestBase to provide database access and inherits
 * all integration test utilities while adding performance-specific features.
 * 
 * Usage:
 * <pre>
 * class MyPerformanceTest extends PerformanceTestBase {
 *     
 *     @Test
 *     void queryPerformance_ShouldBeUnder50ms() {
 *         // Setup test data...
 *         
 *         measurePerformance("findFieldPathsByContextAndMetadata", 
 *             () -> repository.findFieldPathsByContextAndMetadata("deposits", metadata),
 *             50L);
 *     }
 * }
 * </pre>
 */
@TestPropertySource(properties = {
    "spring.profiles.active=test",
    "app.catalog.performance.enable-query-logging=true",  // Enable for performance tests
    "app.catalog.performance.slow-query-threshold-ms=10"  // Lower threshold for testing
})
public abstract class PerformanceTestBase extends IntegrationTestBase {
    
    /**
     * Measures the performance of a runnable operation and asserts it completes within the specified time.
     * 
     * @param operationName descriptive name for the operation being measured
     * @param task the operation to measure
     * @param maxDurationMs maximum allowed duration in milliseconds
     */
    protected void measurePerformance(String operationName, Runnable task, long maxDurationMs) {
        long start = System.currentTimeMillis();
        task.run();
        long duration = System.currentTimeMillis() - start;
        
        assertThat(duration)
            .as("Performance test for '%s' should complete within %dms", operationName, maxDurationMs)
            .isLessThan(maxDurationMs);
            
        System.out.printf("✓ %s: %dms (limit: %dms)%n", operationName, duration, maxDurationMs);
    }
    
    /**
     * Measures the performance of a supplier operation and returns the result while asserting timing.
     * 
     * @param operationName descriptive name for the operation being measured
     * @param task the operation to measure that returns a result
     * @param maxDurationMs maximum allowed duration in milliseconds
     * @return the result of the task execution
     */
    protected <T> T measurePerformance(String operationName, Supplier<T> task, long maxDurationMs) {
        long start = System.currentTimeMillis();
        T result = task.get();
        long duration = System.currentTimeMillis() - start;
        
        assertThat(duration)
            .as("Performance test for '%s' should complete within %dms", operationName, maxDurationMs)
            .isLessThan(maxDurationMs);
            
        System.out.printf("✓ %s: %dms (limit: %dms)%n", operationName, duration, maxDurationMs);
        return result;
    }
    
    /**
     * Measures the performance of an operation and returns detailed timing information.
     * Does not assert on timing - useful for benchmarking and collecting metrics.
     *
     * @param operationName descriptive name for the operation being measured
     * @param task the operation to measure
     * @return PerformanceResult containing timing details
     */
    protected PerformanceResult<Void> benchmarkPerformance(String operationName, Runnable task) {
        long start = System.currentTimeMillis();
        task.run();
        long duration = System.currentTimeMillis() - start;

        PerformanceResult<Void> result = new PerformanceResult<>(operationName, duration);
        System.out.printf("📊 %s: %dms%n", operationName, duration);
        return result;
    }
    
    /**
     * Measures the performance of an operation with a result and returns detailed timing information.
     * 
     * @param operationName descriptive name for the operation being measured
     * @param task the operation to measure that returns a result
     * @return PerformanceResult containing timing details and the task result
     */
    protected <T> PerformanceResult<T> benchmarkPerformance(String operationName, Supplier<T> task) {
        long start = System.currentTimeMillis();
        T taskResult = task.get();
        long duration = System.currentTimeMillis() - start;
        
        PerformanceResult<T> result = new PerformanceResult<>(operationName, duration, taskResult);
        System.out.printf("📊 %s: %dms%n", operationName, duration);
        return result;
    }
    
    /**
     * Runs a warm-up operation to ensure JIT compilation and system stabilization
     * before running performance measurements.
     * 
     * @param warmupTask the operation to run for warm-up
     * @param iterations number of warm-up iterations (recommended: 5-10)
     */
    protected void warmUp(Runnable warmupTask, int iterations) {
        System.out.printf("🔥 Warming up with %d iterations...%n", iterations);
        for (int i = 0; i < iterations; i++) {
            warmupTask.run();
        }
        System.out.println("🔥 Warm-up complete");
    }
    
    /**
     * Container for performance measurement results
     */
    public static class PerformanceResult<T> {
        private final String operationName;
        private final long durationMs;
        private final T result;
        
        public PerformanceResult(String operationName, long durationMs) {
            this(operationName, durationMs, null);
        }
        
        public PerformanceResult(String operationName, long durationMs, T result) {
            this.operationName = operationName;
            this.durationMs = durationMs;
            this.result = result;
        }
        
        public String getOperationName() { return operationName; }
        public long getDurationMs() { return durationMs; }
        public T getResult() { return result; }
        
        public void assertDurationLessThan(long maxMs) {
            assertThat(durationMs)
                .as("Performance result for '%s' should be under %dms", operationName, maxMs)
                .isLessThan(maxMs);
        }
        
        public void assertDurationBetween(long minMs, long maxMs) {
            assertThat(durationMs)
                .as("Performance result for '%s' should be between %dms and %dms", operationName, minMs, maxMs)
                .isBetween(minMs, maxMs);
        }
        
        @Override
        public String toString() {
            return String.format("PerformanceResult{operation='%s', duration=%dms}", operationName, durationMs);
        }
    }
}