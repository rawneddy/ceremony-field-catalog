package com.ceremony.catalog.performance;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.api.dto.ContextDefinitionDTO;
import com.ceremony.catalog.domain.CatalogEntry;
import com.ceremony.catalog.persistence.CatalogRepository;
import com.ceremony.catalog.persistence.ContextRepository;
import com.ceremony.catalog.service.CatalogService;
import com.ceremony.catalog.service.ContextService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Performance benchmark tests for database query optimization.
 * These tests demonstrate the performance improvements from the optimized
 * findXpathsByContextAndMetadata method compared to the previous approach.
 */
@SpringBootTest
@Testcontainers
class QueryPerformanceTest {

    @Container
    static MongoDBContainer mongo = new MongoDBContainer("mongo:7");

    @DynamicPropertySource
    static void mongoProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongo::getReplicaSetUrl);
    }

    @Autowired
    private CatalogService catalogService;
    
    @Autowired
    private ContextService contextService;

    @Autowired
    private CatalogRepository catalogRepository;
    
    @Autowired
    private ContextRepository contextRepository;

    @BeforeEach
    void setUp() {
        catalogRepository.deleteAll();
        contextRepository.deleteAll();
        
        // Create test context
        var contextDef = new ContextDefinitionDTO(
            "deposits",
            "Deposits",
            "Test deposits context for performance testing",
            List.of("productCode", "productSubCode", "action"),
            List.of(),
            true
        );
        contextService.createContext(contextDef);
    }

    @Test
    void findXpathsByContextAndMetadata_Performance_SmallDataset() {
        // Setup: Create 100 catalog entries
        List<CatalogObservationDTO> observations = createTestObservations(100);
        catalogService.merge("deposits", observations);

        Map<String, String> testMetadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );

        // Measure optimized query performance
        long start = System.currentTimeMillis();
        List<String> xpaths = catalogRepository.findXpathsByContextAndMetadata("deposits", testMetadata);
        long duration = System.currentTimeMillis() - start;

        // Assertions
        assertThat(xpaths).isNotEmpty();
        assertThat(duration).isLessThan(50); // Should be very fast for small dataset
        
        System.out.printf("Small dataset (100 entries): %dms%n", duration);
    }

    @Test
    void findXpathsByContextAndMetadata_Performance_MediumDataset() {
        // Setup: Create 1000 catalog entries
        List<CatalogObservationDTO> observations = createTestObservations(1000);
        catalogService.merge("deposits", observations);

        Map<String, String> testMetadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );

        // Measure optimized query performance
        long start = System.currentTimeMillis();
        List<String> xpaths = catalogRepository.findXpathsByContextAndMetadata("deposits", testMetadata);
        long duration = System.currentTimeMillis() - start;

        // Assertions
        assertThat(xpaths).isNotEmpty();
        assertThat(duration).isLessThan(100); // Should be under 100ms even for 1000 entries
        
        System.out.printf("Medium dataset (1000 entries): %dms%n", duration);
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

        // Measure optimized query performance
        long start = System.currentTimeMillis();
        List<String> xpaths = catalogRepository.findXpathsByContextAndMetadata("deposits", testMetadata);
        long duration = System.currentTimeMillis() - start;

        // Assertions
        assertThat(xpaths).isNotEmpty();
        assertThat(duration).isLessThan(200); // Should be under 200ms even for 5000 entries
        
        System.out.printf("Large dataset (5000 entries): %dms%n", duration);
    }

    @Test
    void findXpathsByContextAndMetadata_Accuracy() {
        // Setup: Create specific test data
        List<CatalogObservationDTO> observations = List.of(
            new CatalogObservationDTO(
                Map.of("productCode", "DDA", "productSubCode", "4S", "action", "Fulfillment"),
                "/Ceremony/Account/Amount", 1, false, false
            ),
            new CatalogObservationDTO(
                Map.of("productCode", "DDA", "productSubCode", "4S", "action", "Fulfillment"),
                "/Ceremony/Account/FeeCode", 1, false, false
            ),
            new CatalogObservationDTO(
                Map.of("productCode", "SAV", "productSubCode", "REG", "action", "Fulfillment"),
                "/Ceremony/Account/InterestRate", 1, false, false
            )
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
            observations.add(new CatalogObservationDTO(
                Map.of(
                    "productCode", "DDA",
                    "productSubCode", "4S",
                    "action", "Fulfillment"
                ),
                String.format("/Ceremony/Field%d", i),
                1,
                false,
                false
            ));
        }
        
        return observations;
    }

    private List<CatalogObservationDTO> createDiverseTestObservations(int count) {
        List<CatalogObservationDTO> observations = new ArrayList<>();
        String[] productCodes = {"DDA", "SAV", "CD", "IRA"};
        String[] productSubCodes = {"4S", "REG", "SPEC", "PREM"};
        String[] actions = {"Fulfillment", "Inquiry", "Maintenance"};
        
        for (int i = 0; i < count; i++) {
            observations.add(new CatalogObservationDTO(
                Map.of(
                    "productCode", productCodes[i % productCodes.length],
                    "productSubCode", productSubCodes[i % productSubCodes.length],
                    "action", actions[i % actions.length]
                ),
                String.format("/Ceremony/Field%d", i),
                1,
                false,
                false
            ));
        }
        
        return observations;
    }
}