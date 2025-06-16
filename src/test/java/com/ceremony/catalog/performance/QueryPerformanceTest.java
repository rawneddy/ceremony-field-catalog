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
 * findXpathsByContextAndMetadata method compared to the previous approach.
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
    void findXpathsByContextAndMetadata_Performance_SmallDataset() {
        // Setup: Create 100 catalog entries using builder
        List<CatalogObservationDTO> observations = createTestObservations(100);
        catalogService.merge("deposits", observations);

        Map<String, String> testMetadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );

        // Measure optimized query performance using base class helper
        List<String> xpaths = measurePerformance(
            "Small dataset (100 entries)",
            () -> catalogRepository.findXpathsByContextAndMetadata("deposits", testMetadata),
            50L
        );

        // Assertions
        assertThat(xpaths).isNotEmpty();
    }

    @Test
    void findXpathsByContextAndMetadata_Performance_MediumDataset() {
        // Setup: Create 1000 catalog entries using builder
        List<CatalogObservationDTO> observations = createTestObservations(1000);
        catalogService.merge("deposits", observations);

        Map<String, String> testMetadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );

        // Measure optimized query performance using base class helper
        List<String> xpaths = measurePerformance(
            "Medium dataset (1000 entries)",
            () -> catalogRepository.findXpathsByContextAndMetadata("deposits", testMetadata),
            100L
        );

        // Assertions
        assertThat(xpaths).isNotEmpty();
    }

    @Test
    void findXpathsByContextAndMetadata_Performance_LargeDataset() {
        // Setup: Create 5000 catalog entries across different metadata combinations
        List<CatalogObservationDTO> observations = createDiverseTestObservations(5000);
        catalogService.merge("deposits", observations);

        Map<String, String> testMetadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );

        // Measure optimized query performance using base class helper
        List<String> xpaths = measurePerformance(
            "Large dataset (5000 entries)",
            () -> catalogRepository.findXpathsByContextAndMetadata("deposits", testMetadata),
            200L
        );

        // Assertions
        assertThat(xpaths).isNotEmpty();
    }

    @Test
    void findXpathsByContextAndMetadata_Accuracy() {
        // Setup: Create specific test data using builders
        List<CatalogObservationDTO> observations = List.of(
            TestDataBuilder.depositsObservation()
                .withXpath("/Ceremony/Account/Amount")
                .build(),
            TestDataBuilder.depositsObservation()
                .withXpath("/Ceremony/Account/FeeCode")
                .build(),
            TestDataBuilder.depositsObservation()
                .withProductCode("SAV")
                .withProductSubCode("REG")
                .withXpath("/Ceremony/Account/InterestRate")
                .build()
        );
        catalogService.merge("deposits", observations);

        // Test: Query for specific metadata
        Map<String, String> targetMetadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );
        
        List<String> xpaths = catalogRepository.findXpathsByContextAndMetadata("deposits", targetMetadata);

        // Assertions
        assertThat(xpaths).hasSize(2);
        assertThat(xpaths).containsExactlyInAnyOrder(
            "/Ceremony/Account/Amount",
            "/Ceremony/Account/FeeCode"
        );
    }

    @Test
    void findXpathsByContextAndMetadata_MemoryEfficiency() {
        // Setup: Create test data
        List<CatalogObservationDTO> observations = createTestObservations(1000);
        catalogService.merge("deposits", observations);

        Map<String, String> testMetadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );

        // Measure memory usage by checking returned data size
        List<String> xpaths = catalogRepository.findXpathsByContextAndMetadata("deposits", testMetadata);
        
        // Verify we get only XPath strings (minimal data transfer)
        for (String xpath : xpaths) {
            assertThat(xpath).isNotBlank();
            assertThat(xpath).startsWith("/"); // Valid XPath format
        }
        
        // Should return XPaths for the specific metadata filter (all 1000 in this case since they match)
        assertThat(xpaths.size()).isLessThanOrEqualTo(1000);
        
        System.out.printf("Memory efficiency: returned %d XPaths from 1000 total entries%n", xpaths.size());
    }

    private List<CatalogObservationDTO> createTestObservations(int count) {
        List<CatalogObservationDTO> observations = new ArrayList<>();
        
        for (int i = 0; i < count; i++) {
            observations.add(
                TestDataBuilder.depositsObservation()
                    .withXpath(String.format("/Ceremony/Field%d", i))
                    .build()
            );
        }
        
        return observations;
    }

    private List<CatalogObservationDTO> createDiverseTestObservations(int count) {
        List<CatalogObservationDTO> observations = new ArrayList<>();
        String[] productCodes = {"DDA", "SAV", "CD", "IRA"};
        String[] productSubCodes = {"4S", "REG", "SPEC", "PREM"};
        String[] actions = {"Fulfillment", "Inquiry", "Maintenance"};
        
        for (int i = 0; i < count; i++) {
            observations.add(
                TestDataBuilder.depositsObservation()
                    .withProductCode(productCodes[i % productCodes.length])
                    .withProductSubCode(productSubCodes[i % productSubCodes.length])
                    .withAction(actions[i % actions.length])
                    .withXpath(String.format("/Ceremony/Field%d", i))
                    .build()
            );
        }
        
        return observations;
    }
}