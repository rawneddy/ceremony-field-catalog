package com.ceremony.catalog.base;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.api.dto.ContextDefinitionDTO;
import com.ceremony.catalog.persistence.CatalogRepository;
import com.ceremony.catalog.persistence.ContextRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.mongodb.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;

/**
 * Base class for integration tests that require a full Spring application context
 * and real MongoDB database via Testcontainers.
 * 
 * Provides:
 * - Shared MongoDB container with reuse for performance
 * - Common test dependencies injection
 * - Database cleanup between tests
 * - Common test data builders
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@TestPropertySource(properties = {
    "spring.profiles.active=test",
    "app.catalog.performance.enable-query-logging=false"
})
public abstract class IntegrationTestBase {
    
    @Container
    static MongoDBContainer mongoContainer = new MongoDBContainer("mongo:7")
            .withReuse(true);  // Reuse across test classes for performance
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongoContainer::getReplicaSetUrl);
    }
    
    @Autowired
    protected TestRestTemplate restTemplate;
    
    @Autowired
    protected CatalogRepository catalogRepository;
    
    @Autowired
    protected ContextRepository contextRepository;
    
    @BeforeEach
    void cleanupDatabase() {
        catalogRepository.deleteAll();
        contextRepository.deleteAll();
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
}