package com.ceremony.catalog.base;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.api.dto.ContextDefinitionDTO;
import com.ceremony.catalog.config.CatalogProperties;
import com.ceremony.catalog.domain.CatalogEntry;
import com.ceremony.catalog.persistence.CatalogRepository;
import com.ceremony.catalog.persistence.ContextRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Base class for unit tests that focus on testing individual classes in isolation
 * using mocked dependencies.
 * 
 * Provides:
 * - Common mock objects used across unit tests
 * - Standard mock configuration setup
 * - Common test data builders
 * - Assertion helpers for domain objects
 */
@ExtendWith(MockitoExtension.class)
public abstract class UnitTestBase {
    
    // Common mocks that most unit tests need
    @Mock
    protected CatalogRepository catalogRepository;
    
    @Mock
    protected ContextRepository contextRepository;
    
    @Mock
    protected CatalogProperties catalogProperties;
    
    @Mock
    protected CatalogProperties.Validation validation;
    
    @Mock
    protected CatalogProperties.Performance performance;
    
    @Mock
    protected CatalogProperties.Database database;
    
    @Mock
    protected CatalogProperties.Batch batch;
    
    @Mock
    protected CatalogProperties.Search search;
    
    @Mock
    protected CatalogProperties.Cache cache;
    
    /**
     * Setup common mock configurations that most tests expect
     */
    @BeforeEach
    void setupCommonMocks() {
        // Setup default behavior for CatalogProperties
        when(catalogProperties.getValidation()).thenReturn(validation);
        when(catalogProperties.getPerformance()).thenReturn(performance);
        when(catalogProperties.getDatabase()).thenReturn(database);
        when(catalogProperties.getBatch()).thenReturn(batch);
        when(catalogProperties.getSearch()).thenReturn(search);
        when(catalogProperties.getCache()).thenReturn(cache);
        
        // Setup sensible defaults for validation
        when(validation.getMaxFieldPathLength()).thenReturn(1000);
        when(validation.getMaxContextIdLength()).thenReturn(100);
        when(validation.getMaxMetadataKeyLength()).thenReturn(100);
        when(validation.getMaxMetadataValueLength()).thenReturn(500);
        
        // Setup sensible defaults for performance
        when(performance.getSlowQueryThresholdMs()).thenReturn(100);
        when(performance.isEnableQueryLogging()).thenReturn(false);
        when(performance.getMaxBatchSize()).thenReturn(1000);
        when(performance.isEnableMetrics()).thenReturn(true);
        
        // Setup sensible defaults for search
        when(search.getMaxResults()).thenReturn(10000);
        when(search.getDefaultPageSize()).thenReturn(20);
        when(search.getMaxPageSize()).thenReturn(1000);
        when(search.getTimeout()).thenReturn(Duration.ofSeconds(30));
        
        // Setup sensible defaults for batch
        when(batch.getMaxSize()).thenReturn(1000);
        when(batch.getTimeout()).thenReturn(Duration.ofMinutes(5));
        
        // Setup sensible defaults for cache
        when(cache.isEnabled()).thenReturn(false);
        when(cache.getTtl()).thenReturn(Duration.ofMinutes(15));
        when(cache.getMaxSize()).thenReturn(1000);
    }
    
    /**
     * Creates a test context definition with sensible defaults
     */
    protected ContextDefinitionDTO createTestContext(String id, String... requiredFields) {
        return new ContextDefinitionDTO(
            id, 
            id.toUpperCase(), 
            "Test " + id + " context", 
            List.of(requiredFields), 
            List.of(), 
            true
        );
    }
    
    /**
     * Creates a test catalog observation with sensible defaults
     */
    protected CatalogObservationDTO createTestObservation(Map<String, String> metadata, String fieldPath) {
        return new CatalogObservationDTO(metadata, fieldPath, 1, false, false);
    }
    
    /**
     * Common assertion helper for catalog entries
     */
    protected void assertCatalogEntry(CatalogEntry entry, String expectedFieldPath, String expectedContextId) {
        assertThat(entry.getFieldPath()).isEqualTo(expectedFieldPath);
        assertThat(entry.getContextId()).isEqualTo(expectedContextId);
    }
    
    /**
     * Assert that a catalog entry has the expected metadata
     */
    protected void assertCatalogEntryMetadata(CatalogEntry entry, String key, String expectedValue) {
        assertThat(entry.getMetadata())
            .as("Entry metadata should contain key '%s'", key)
            .containsKey(key)
            .as("Entry metadata['%s'] should equal '%s'", key, expectedValue)
            .containsEntry(key, expectedValue);
    }
}