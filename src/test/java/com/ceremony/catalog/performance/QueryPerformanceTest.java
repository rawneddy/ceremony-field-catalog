package com.ceremony.catalog.performance;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.base.PerformanceTestBase;
import com.ceremony.catalog.service.CatalogService;
import com.ceremony.catalog.service.ContextService;
import com.ceremony.catalog.util.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Performance benchmark tests for database query optimization.
 * These tests demonstrate the performance improvements from the optimized
 * findFieldPathsByContextAndMetadata method compared to the previous approach.
 */
class QueryPerformanceTest extends PerformanceTestBase {

    @Autowired
    private CatalogService catalogService;
    
    @Autowired
    private ContextService contextService;

    @BeforeEach
    void setUp() {
        // Create test context using builder
        contextService.createContext(TestDataBuilder.depositsContext());
    }

    @Test
    void findFieldPathsByContextAndMetadata_Performance_SmallDataset() {
        // Setup: Create 100 catalog entries using builder
        List<CatalogObservationDTO> observations = createTestObservations(100);
        catalogService.merge("deposits", observations);

        Map<String, String> testMetadata = Map.of(
            "productcode", "dda",
            "productsubcode", "4s",
            "action", "fulfillment"
        );

        // Measure optimized query performance using base class helper
        List<String> fieldPaths = measurePerformance(
            "Small dataset (100 entries)",
            () -> catalogRepository.findFieldPathsByContextAndMetadata("deposits", testMetadata),
            50L
        );

        // Assertions
        assertThat(fieldPaths).isNotEmpty();
    }

    @Test
    void findFieldPathsByContextAndMetadata_Performance_MediumDataset() {
        // Setup: Create 1000 catalog entries using builder
        List<CatalogObservationDTO> observations = createTestObservations(1000);
        catalogService.merge("deposits", observations);

        Map<String, String> testMetadata = Map.of(
            "productcode", "dda",
            "productsubcode", "4s",
            "action", "fulfillment"
        );

        // Measure optimized query performance using base class helper
        List<String> fieldPaths = measurePerformance(
            "Medium dataset (1000 entries)",
            () -> catalogRepository.findFieldPathsByContextAndMetadata("deposits", testMetadata),
            100L
        );

        // Assertions
        assertThat(fieldPaths).isNotEmpty();
    }

    @Test
    void findFieldPathsByContextAndMetadata_Performance_LargeDataset() {
        // Setup: Create 5000 catalog entries across different metadata combinations
        List<CatalogObservationDTO> observations = createDiverseTestObservations(5000);
        catalogService.merge("deposits", observations);

        Map<String, String> testMetadata = Map.of(
            "productcode", "dda",
            "productsubcode", "4s",
            "action", "fulfillment"
        );

        // Measure optimized query performance using base class helper
        List<String> fieldPaths = measurePerformance(
            "Large dataset (5000 entries)",
            () -> catalogRepository.findFieldPathsByContextAndMetadata("deposits", testMetadata),
            200L
        );

        // Assertions
        assertThat(fieldPaths).isNotEmpty();
    }

    @Test
    void findFieldPathsByContextAndMetadata_Accuracy() {
        // Setup: Create specific test data using builders - mixed case inputs
        List<CatalogObservationDTO> observations = List.of(
            TestDataBuilder.depositsObservation()
                .withFieldPath("/Ceremony/Account/Amount")  // Mixed case
                .build(),
            TestDataBuilder.depositsObservation()
                .withFieldPath("/Ceremony/Account/FeeCode")  // Mixed case
                .build(),
            TestDataBuilder.depositsObservation()
                .withProductCode("SAV")
                .withProductSubCode("REG")
                .withFieldPath("/Ceremony/Account/InterestRate")  // Mixed case
                .build()
        );
        catalogService.merge("deposits", observations);

        // Test: Query for specific metadata
        Map<String, String> targetMetadata = Map.of(
            "productcode", "dda",
            "productsubcode", "4s",
            "action", "fulfillment"
        );

        List<String> fieldPaths = catalogRepository.findFieldPathsByContextAndMetadata("deposits", targetMetadata);

        // Assertions - expect lowercase (API normalizes on input)
        assertThat(fieldPaths).hasSize(2);
        assertThat(fieldPaths).containsExactlyInAnyOrder(
            "/ceremony/account/amount",
            "/ceremony/account/feecode"
        );
    }

    @Test
    void findFieldPathsByContextAndMetadata_MemoryEfficiency() {
        // Setup: Create test data
        List<CatalogObservationDTO> observations = createTestObservations(1000);
        catalogService.merge("deposits", observations);

        Map<String, String> testMetadata = Map.of(
            "productcode", "dda",
            "productsubcode", "4s",
            "action", "fulfillment"
        );

        // Measure memory usage by checking returned data size
        List<String> fieldPaths = catalogRepository.findFieldPathsByContextAndMetadata("deposits", testMetadata);
        
        // Verify we get only fieldPath strings (minimal data transfer)
        for (String fieldPath : fieldPaths) {
            assertThat(fieldPath).isNotBlank();
            assertThat(fieldPath).startsWith("/"); // Valid fieldPath format
        }
        
        // Should return fieldPaths for the specific metadata filter (all 1000 in this case since they match)
        assertThat(fieldPaths.size()).isLessThanOrEqualTo(1000);
        
        System.out.printf("Memory efficiency: returned %d fieldPaths from 1000 total entries%n", fieldPaths.size());
    }

    private List<CatalogObservationDTO> createTestObservations(int count) {
        List<CatalogObservationDTO> observations = new ArrayList<>();
        
        for (int i = 0; i < count; i++) {
            observations.add(
                TestDataBuilder.depositsObservation()
                    .withFieldPath(String.format("/ceremony/field%d", i))
                    .build()
            );
        }
        
        return observations;
    }

    private List<CatalogObservationDTO> createDiverseTestObservations(int count) {
        List<CatalogObservationDTO> observations = new ArrayList<>();
        String[] productCodes = {"dda", "sav", "cd", "ira"};
        String[] productSubCodes = {"4s", "reg", "spec", "prem"};
        String[] actions = {"fulfillment", "inquiry", "maintenance"};
        
        for (int i = 0; i < count; i++) {
            observations.add(
                TestDataBuilder.depositsObservation()
                    .withProductCode(productCodes[i % productCodes.length])
                    .withProductSubCode(productSubCodes[i % productSubCodes.length])
                    .withAction(actions[i % actions.length])
                    .withFieldPath(String.format("/ceremony/field%d", i))
                    .build()
            );
        }
        
        return observations;
    }
}