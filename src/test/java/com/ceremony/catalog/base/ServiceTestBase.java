package com.ceremony.catalog.base;

import com.ceremony.catalog.api.dto.ContextDefinitionDTO;
import com.ceremony.catalog.domain.Context;
import com.ceremony.catalog.persistence.CatalogRepository;
import com.ceremony.catalog.persistence.ContextRepository;
import com.ceremony.catalog.service.CatalogService;
import com.ceremony.catalog.service.ContextService;
import com.ceremony.catalog.service.InputValidationService;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Base class for service layer tests that require business logic validation
 * with a real database but focused on service layer behavior.
 * 
 * Provides:
 * - Testcontainers for MongoDB
 * - Autowired service dependencies
 * - Service-specific test helpers
 * - Context creation and verification utilities
 */
@SpringBootTest
@Testcontainers
@TestPropertySource(properties = {
    "spring.profiles.active=test",
    "app.catalog.performance.enable-query-logging=false"
})
public abstract class ServiceTestBase {
    
    @Container
    static MongoDBContainer mongoContainer = new MongoDBContainer("mongo:7")
            .withReuse(true);  // Reuse across test classes for performance
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongoContainer::getReplicaSetUrl);
    }
    
    @Autowired
    protected CatalogService catalogService;
    
    @Autowired
    protected ContextService contextService;
    
    @Autowired
    protected InputValidationService validationService;
    
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
     * Creates a context and verifies it was created successfully
     * 
     * @param contextId the context ID to create
     * @param requiredFields the required metadata fields for the context
     */
    protected void createAndVerifyContext(String contextId, String... requiredFields) {
        ContextDefinitionDTO contextDef = createTestContext(contextId, requiredFields);
        contextService.createContext(contextDef);
        
        Optional<Context> context = contextService.getContext(contextId);
        assertThat(context)
            .as("Context '%s' should be created successfully", contextId)
            .isPresent();
        assertThat(context.get().getRequiredMetadata())
            .as("Context '%s' should have the correct required fields", contextId)
            .containsExactlyInAnyOrder(requiredFields);
    }
    
    /**
     * Verifies that a context exists and is active
     */
    protected void assertContextExists(String contextId) {
        Optional<Context> context = contextService.getContext(contextId);
        assertThat(context)
            .as("Context '%s' should exist", contextId)
            .isPresent();
        assertThat(context.get().isActive())
            .as("Context '%s' should be active", contextId)
            .isTrue();
    }
    
    /**
     * Verifies that a context does not exist
     */
    protected void assertContextDoesNotExist(String contextId) {
        Optional<Context> context = contextService.getContext(contextId);
        assertThat(context)
            .as("Context '%s' should not exist", contextId)
            .isEmpty();
    }
    
    /**
     * Helper method to create a test context definition
     */
    protected ContextDefinitionDTO createTestContext(String contextId, String... requiredFields) {
        return new ContextDefinitionDTO(
            contextId,
            contextId + " Test Context",
            "Test context for " + contextId,
            java.util.List.of(requiredFields),
            java.util.List.of(),
            true
        );
    }
    
    /**
     * Creates a context if it doesn't already exist
     */
    protected void ensureContextExists(String contextId, String... requiredFields) {
        if (contextService.getContext(contextId).isEmpty()) {
            createAndVerifyContext(contextId, requiredFields);
        }
    }
}