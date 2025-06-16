package com.ceremony.catalog.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Aspect for monitoring query performance in repository methods.
 * Logs slow queries based on configurable thresholds.
 * 
 * Can be enabled/disabled via configuration:
 * app.catalog.performance.enable-query-logging=true
 */
@Aspect
@Component
@ConditionalOnProperty(value = "app.catalog.performance.enable-query-logging", havingValue = "true")
@Slf4j
@RequiredArgsConstructor
public class QueryPerformanceAspect {

    private final CatalogProperties catalogProperties;

    /**
     * Monitor all repository method calls for performance
     */
    @Around("execution(* com.ceremony.catalog.persistence..*(..))")
    public Object monitorRepositoryPerformance(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().getName();
        String className = joinPoint.getSignature().getDeclaringType().getSimpleName();
        
        long startTime = System.currentTimeMillis();
        Object result = null;
        Exception exception = null;
        
        try {
            result = joinPoint.proceed();
            return result;
        } catch (Exception e) {
            exception = e;
            throw e;
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            logPerformanceMetrics(className, methodName, duration, result, exception);
        }
    }

    /**
     * Monitor catalog service method calls for performance
     */
    @Around("execution(* com.ceremony.catalog.service.CatalogService.*(..))")
    public Object monitorCatalogServicePerformance(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().getName();
        
        long startTime = System.currentTimeMillis();
        Object result = null;
        Exception exception = null;
        
        try {
            result = joinPoint.proceed();
            return result;
        } catch (Exception e) {
            exception = e;
            throw e;
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            logServicePerformanceMetrics(methodName, duration, result, exception);
        }
    }

    private void logPerformanceMetrics(String className, String methodName, long duration, Object result, Exception exception) {
        int threshold = catalogProperties.getPerformance().getSlowQueryThresholdMs();
        
        if (duration > threshold) {
            String resultInfo = getResultInfo(result);
            if (exception != null) {
                log.warn("Slow query with ERROR in {}.{}: {}ms - Exception: {} - Result: {}", 
                    className, methodName, duration, exception.getClass().getSimpleName(), resultInfo);
            } else {
                log.warn("Slow query in {}.{}: {}ms - Result: {}", 
                    className, methodName, duration, resultInfo);
            }
        } else if (catalogProperties.getPerformance().isEnableMetrics()) {
            // Log all queries for metrics collection (DEBUG level)
            log.debug("Query performance {}.{}: {}ms", className, methodName, duration);
        }
    }

    private void logServicePerformanceMetrics(String methodName, long duration, Object result, Exception exception) {
        int threshold = catalogProperties.getPerformance().getSlowQueryThresholdMs() * 2; // Higher threshold for service methods
        
        if (duration > threshold) {
            String resultInfo = getResultInfo(result);
            if (exception != null) {
                log.warn("Slow service operation with ERROR in CatalogService.{}: {}ms - Exception: {} - Result: {}", 
                    methodName, duration, exception.getClass().getSimpleName(), resultInfo);
            } else {
                log.warn("Slow service operation in CatalogService.{}: {}ms - Result: {}", 
                    methodName, duration, resultInfo);
            }
        } else if (catalogProperties.getPerformance().isEnableMetrics() && duration > 10) {
            // Log service operations over 10ms for metrics
            log.debug("Service performance CatalogService.{}: {}ms", methodName, duration);
        }
    }

    private String getResultInfo(Object result) {
        if (result == null) {
            return "null";
        }
        
        // Provide useful info about result size/type without logging sensitive data
        if (result instanceof java.util.Collection<?> collection) {
            return String.format("Collection[size=%d]", collection.size());
        } else if (result instanceof org.springframework.data.domain.Page<?> page) {
            return String.format("Page[elements=%d, totalElements=%d, totalPages=%d]", 
                page.getNumberOfElements(), page.getTotalElements(), page.getTotalPages());
        } else if (result instanceof String) {
            return String.format("String[length=%d]", ((String) result).length());
        } else {
            return result.getClass().getSimpleName();
        }
    }
}