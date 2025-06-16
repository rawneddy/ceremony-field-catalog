package com.ceremony.catalog.service;

import com.ceremony.catalog.api.dto.ContextDefinitionDTO;
import com.ceremony.catalog.domain.Context;
import com.ceremony.catalog.persistence.ContextRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Testcontainers
class ContextServiceTest {
    
    @Container
    static MongoDBContainer mongo = new MongoDBContainer("mongo:7");

    @DynamicPropertySource
    static void mongoProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongo::getReplicaSetUrl);
    }

    @Autowired
    ContextService contextService;
    
    @Autowired
    ContextRepository contextRepository;
    
    @BeforeEach
    void cleanDatabase() {
        contextRepository.deleteAll();
    }
    
    @Test
    void createContextSucceeds() {
        var dto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("field1", "field2"),
            List.of("optional1"),
            true
        );
        
        Context created = contextService.createContext(dto);
        
        assertThat(created.getContextId()).isEqualTo("test-context");
        assertThat(created.getDisplayName()).isEqualTo("Test Context");
        assertThat(created.getDescription()).isEqualTo("Test description");
        assertThat(created.getRequiredMetadata()).containsExactly("field1", "field2");
        assertThat(created.getOptionalMetadata()).containsExactly("optional1");
        assertThat(created.isActive()).isTrue();
        assertThat(created.getCreatedAt()).isNotNull();
        assertThat(created.getUpdatedAt()).isNull();
    }
    
    @Test
    void updateContextAllowsOptionalMetadataChanges() {
        // Create initial context
        var initialDto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("field1", "field2"),
            List.of("optional1"),
            true
        );
        contextService.createContext(initialDto);
        
        // Update with new optional metadata
        var updateDto = new ContextDefinitionDTO(
            "test-context",
            "Updated Context",
            "Updated description",
            List.of("field1", "field2"), // Same required metadata
            List.of("optional1", "optional2", "optional3"), // Different optional metadata
            false
        );
        
        var updated = contextService.updateContext("test-context", updateDto);
        
        assertThat(updated).isPresent();
        assertThat(updated.get().getDisplayName()).isEqualTo("Updated Context");
        assertThat(updated.get().getDescription()).isEqualTo("Updated description");
        assertThat(updated.get().getRequiredMetadata()).containsExactly("field1", "field2");
        assertThat(updated.get().getOptionalMetadata()).containsExactly("optional1", "optional2", "optional3");
        assertThat(updated.get().isActive()).isFalse();
        assertThat(updated.get().getUpdatedAt()).isNotNull();
    }
    
    @Test
    void updateContextAllowsRemovingOptionalMetadata() {
        // Create initial context
        var initialDto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("field1", "field2"),
            List.of("optional1", "optional2"),
            true
        );
        contextService.createContext(initialDto);
        
        // Update with fewer optional metadata fields
        var updateDto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("field1", "field2"), // Same required metadata
            List.of("optional1"), // Removed optional2
            true
        );
        
        var updated = contextService.updateContext("test-context", updateDto);
        
        assertThat(updated).isPresent();
        assertThat(updated.get().getOptionalMetadata()).containsExactly("optional1");
    }
    
    @Test
    void updateContextPreventsAddingRequiredMetadata() {
        // Create initial context
        var initialDto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("field1", "field2"),
            List.of("optional1"),
            true
        );
        contextService.createContext(initialDto);
        
        // Try to add required metadata
        var updateDto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("field1", "field2", "field3"), // Added field3
            List.of("optional1"),
            true
        );
        
        assertThatThrownBy(() -> contextService.updateContext("test-context", updateDto))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Required metadata cannot be changed after context creation")
            .hasMessageContaining("field1, field2")
            .hasMessageContaining("field1, field2, field3")
            .hasMessageContaining("Create a new context for different required metadata");
    }
    
    @Test
    void updateContextPreventsRemovingRequiredMetadata() {
        // Create initial context
        var initialDto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("field1", "field2", "field3"),
            List.of("optional1"),
            true
        );
        contextService.createContext(initialDto);
        
        // Try to remove required metadata
        var updateDto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("field1", "field2"), // Removed field3
            List.of("optional1"),
            true
        );
        
        assertThatThrownBy(() -> contextService.updateContext("test-context", updateDto))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Required metadata cannot be changed after context creation")
            .hasMessageContaining("field1, field2, field3")
            .hasMessageContaining("field1, field2");
    }
    
    @Test
    void updateContextAllowsReorderingRequiredMetadata() {
        // Create initial context
        var initialDto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("field1", "field2", "field3"),
            List.of("optional1"),
            true
        );
        contextService.createContext(initialDto);
        
        // Try to reorder required metadata (should be allowed - order doesn't matter for validation)
        var updateDto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("field3", "field1", "field2"), // Same fields, different order
            List.of("optional1"),
            true
        );
        
        var updated = contextService.updateContext("test-context", updateDto);
        
        // Should succeed because it's the same set of fields (note: order is preserved from original)
        assertThat(updated).isPresent();
        assertThat(updated.get().getRequiredMetadata()).containsExactlyInAnyOrder("field1", "field2", "field3");
    }
    
    @Test
    void updateNonExistentContextReturnsEmpty() {
        var updateDto = new ContextDefinitionDTO(
            "nonexistent",
            "Test Context",
            "Test description",
            List.of("field1"),
            List.of(),
            true
        );
        
        var result = contextService.updateContext("nonexistent", updateDto);
        
        assertThat(result).isEmpty();
    }
    
    @Test
    void deleteExistingContextReturnsTrue() {
        var dto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("field1"),
            List.of(),
            true
        );
        contextService.createContext(dto);
        
        boolean deleted = contextService.deleteContext("test-context");
        
        assertThat(deleted).isTrue();
        assertThat(contextService.getContext("test-context")).isEmpty();
    }
    
    @Test
    void deleteNonExistentContextReturnsFalse() {
        boolean deleted = contextService.deleteContext("nonexistent");
        
        assertThat(deleted).isFalse();
    }
}