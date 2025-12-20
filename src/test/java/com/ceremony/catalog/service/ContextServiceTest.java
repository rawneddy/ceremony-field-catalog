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
import org.testcontainers.mongodb.MongoDBContainer;
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
            null, // metadataRules
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
            null, // metadataRules
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
            null, // metadataRules
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
            null, // metadataRules
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
            null, // metadataRules
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
            null, // metadataRules
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
            null, // metadataRules
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
            null, // metadataRules
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
            null, // metadataRules
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
            null, // metadataRules
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
            null, // metadataRules
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
            null, // metadataRules
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
            null, // metadataRules
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

    // ===== CASE-INSENSITIVE METADATA TESTS =====

    @Test
    void createContextNormalizesMetadataFieldsToLowercase() {
        var dto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("ProductCode", "ACTION", "SubType"),  // Mixed case required fields
            List.of("OptionalField", "CATEGORY"),  // Mixed case optional fields
            null, // metadataRules
            true
        );
        
        Context created = contextService.createContext(dto);
        
        // Verify that all metadata field names are normalized to lowercase
        assertThat(created.getRequiredMetadata()).containsExactly("productcode", "action", "subtype");
        assertThat(created.getOptionalMetadata()).containsExactly("optionalfield", "category");
    }

    @Test
    void updateContextNormalizesOptionalMetadataToLowercase() {
        // Create initial context with mixed case
        var initialDto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("ProductCode", "Action"),  // Mixed case required fields
            List.of("OptionalField"),  // Mixed case optional field
            null, // metadataRules
            true
        );
        contextService.createContext(initialDto);
        
        // Update with new optional metadata in different case
        var updateDto = new ContextDefinitionDTO(
            "test-context",
            "Updated Context",
            "Updated description",
            List.of("productcode", "action"), // Same required metadata (lowercase)
            List.of("NEWFIELD", "AnotherField"), // Mixed case optional fields
            null, // metadataRules
            true
        );
        
        var updated = contextService.updateContext("test-context", updateDto);
        
        assertThat(updated).isPresent();
        assertThat(updated.get().getRequiredMetadata()).containsExactly("productcode", "action");
        assertThat(updated.get().getOptionalMetadata()).containsExactly("newfield", "anotherfield");
    }

    @Test
    void updateContextAcceptsCaseVariationsOfRequiredMetadata() {
        // Create initial context
        var initialDto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("productcode", "action"),
            List.of("optional1"),
            null, // metadataRules
            true
        );
        contextService.createContext(initialDto);
        
        // Update with same required metadata but different case - should be allowed
        var updateDto = new ContextDefinitionDTO(
            "test-context",
            "Updated Context",
            "Updated description",
            List.of("ProductCode", "ACTION"), // Same fields, different case
            List.of("optional2"),
            null, // metadataRules
            true
        );
        
        var updated = contextService.updateContext("test-context", updateDto);
        
        // Should succeed because it's the same set of fields (case-insensitive)
        assertThat(updated).isPresent();
        assertThat(updated.get().getDisplayName()).isEqualTo("Updated Context");
        assertThat(updated.get().getRequiredMetadata()).containsExactly("productcode", "action");
        assertThat(updated.get().getOptionalMetadata()).containsExactly("optional2");
    }

    @Test
    void updateContextRejectsCaseVariationsThatActuallyAddFields() {
        // Create initial context
        var initialDto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("productcode", "action"),
            List.of("optional1"),
            null, // metadataRules
            true
        );
        contextService.createContext(initialDto);
        
        // Try to add a genuinely new required field (not just case variation)
        var updateDto = new ContextDefinitionDTO(
            "test-context",
            "Updated Context",
            "Updated description",
            List.of("ProductCode", "ACTION", "newfield"), // Added genuinely new field
            List.of("optional1"),
            null, // metadataRules
            true
        );
        
        assertThatThrownBy(() -> contextService.updateContext("test-context", updateDto))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Required metadata cannot be changed after context creation");
    }

    @Test
    void updateContextRejectsCaseVariationsThatActuallyRemoveFields() {
        // Create initial context with 3 required fields
        var initialDto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("productcode", "action", "subtype"),
            List.of("optional1"),
            null, // metadataRules
            true
        );
        contextService.createContext(initialDto);
        
        // Try to remove a required field (but include case variations of the others)
        var updateDto = new ContextDefinitionDTO(
            "test-context",
            "Updated Context",
            "Updated description",
            List.of("ProductCode", "ACTION"), // Missing subtype, even with case variations
            List.of("optional1"),
            null, // metadataRules
            true
        );
        
        assertThatThrownBy(() -> contextService.updateContext("test-context", updateDto))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Required metadata cannot be changed after context creation");
    }

    @Test
    void createContextHandlesNullOptionalMetadata() {
        var dto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("ProductCode", "ACTION"), // Mixed case required fields
            null, // Null optional metadata
            null, // metadataRules
            true
        );
        
        Context created = contextService.createContext(dto);
        
        assertThat(created.getRequiredMetadata()).containsExactly("productcode", "action");
        assertThat(created.getOptionalMetadata()).isNull();
    }

    @Test
    void updateContextHandlesNullRequiredMetadata() {
        // Create initial context
        var initialDto = new ContextDefinitionDTO(
            "test-context",
            "Test Context",
            "Test description",
            List.of("productcode"),
            List.of("optional1"),
            null, // metadataRules
            true
        );
        contextService.createContext(initialDto);
        
        // Try to update with null required metadata
        var updateDto = new ContextDefinitionDTO(
            "test-context",
            "Updated Context",
            "Updated description",
            null, // Null required metadata
            List.of("optional1"),
            null, // metadataRules
            true
        );
        
        assertThatThrownBy(() -> contextService.updateContext("test-context", updateDto))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Required metadata cannot be changed after context creation");
    }
}