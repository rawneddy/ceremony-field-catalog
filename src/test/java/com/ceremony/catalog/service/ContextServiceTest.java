package com.ceremony.catalog.service;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.api.dto.ContextDefinitionDTO;
import com.ceremony.catalog.api.dto.ContextWithCountDTO;
import com.ceremony.catalog.api.dto.MetadataExtractionRuleDTO;
import com.ceremony.catalog.domain.Context;
import com.ceremony.catalog.persistence.CatalogRepository;
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
import java.util.Map;

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
    CatalogService catalogService;

    @Autowired
    ContextRepository contextRepository;

    @Autowired
    CatalogRepository catalogRepository;

    @BeforeEach
    void cleanDatabase() {
        catalogRepository.deleteAll();
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

    // ===== METADATA RULES TESTS =====

    private MetadataExtractionRuleDTO rule(List<String> xpaths) {
        return MetadataExtractionRuleDTO.builder().xpaths(xpaths).build();
    }

    private MetadataExtractionRuleDTO rule(List<String> xpaths, String validationRegex) {
        return MetadataExtractionRuleDTO.builder().xpaths(xpaths).validationRegex(validationRegex).build();
    }

    @Test
    void createContextWithValidMetadataRules() {
        var rules = java.util.Map.of(
            "productcode", rule(List.of("/ceremony/productCode", "/header/product")),
            "region", rule(List.of("/address/state"))
        );

        var dto = ContextDefinitionDTO.builder()
            .contextId("test-context")
            .displayName("Test Context")
            .description("Test description")
            .requiredMetadata(List.of("productcode"))
            .optionalMetadata(List.of("region"))
            .metadataRules(rules)
            .active(true)
            .build();

        Context created = contextService.createContext(dto);

        assertThat(created.getMetadataRules()).isNotNull();
        assertThat(created.getMetadataRules()).hasSize(2);
        // XPaths are normalized to lowercase
        assertThat(created.getMetadataRules().get("productcode").getXpaths())
            .containsExactly("/ceremony/productcode", "/header/product");
        assertThat(created.getMetadataRules().get("region").getXpaths())
            .containsExactly("/address/state");
    }

    @Test
    void createContextWithNullMetadataRulesIsValid() {
        var dto = ContextDefinitionDTO.builder()
            .contextId("test-context")
            .displayName("Test Context")
            .description("Test description")
            .requiredMetadata(List.of("productcode"))
            .optionalMetadata(List.of("region"))
            .metadataRules(null)
            .active(true)
            .build();

        Context created = contextService.createContext(dto);

        assertThat(created.getMetadataRules()).isNull();
    }

    @Test
    void updateContextWithMetadataRules() {
        // Create initial context without rules
        var initialDto = ContextDefinitionDTO.builder()
            .contextId("test-context")
            .displayName("Test Context")
            .description("Test description")
            .requiredMetadata(List.of("productcode"))
            .optionalMetadata(List.of("region"))
            .metadataRules(null)
            .active(true)
            .build();
        contextService.createContext(initialDto);

        // Update with rules
        var rules = java.util.Map.of(
            "productcode", rule(List.of("/ceremony/productCode"))
        );
        var updateDto = ContextDefinitionDTO.builder()
            .contextId("test-context")
            .displayName("Test Context")
            .description("Test description")
            .requiredMetadata(List.of("productcode"))
            .optionalMetadata(List.of("region"))
            .metadataRules(rules)
            .active(true)
            .build();

        var updated = contextService.updateContext("test-context", updateDto);

        assertThat(updated).isPresent();
        assertThat(updated.get().getMetadataRules()).isNotNull();
        // XPaths are normalized to lowercase
        assertThat(updated.get().getMetadataRules().get("productcode").getXpaths())
            .containsExactly("/ceremony/productcode");
    }

    @Test
    void metadataRulesPersistedAndRetrieved() {
        var rules = java.util.Map.of(
            "productcode", rule(List.of("/ceremony/productCode", "/alt/path"), "^[A-Z]{3}$")
        );

        var dto = ContextDefinitionDTO.builder()
            .contextId("test-context")
            .displayName("Test Context")
            .description("Test description")
            .requiredMetadata(List.of("productcode"))
            .optionalMetadata(null)
            .metadataRules(rules)
            .active(true)
            .build();

        contextService.createContext(dto);

        // Retrieve and verify
        var retrieved = contextService.getContext("test-context");

        assertThat(retrieved).isPresent();
        assertThat(retrieved.get().getMetadataRules()).isNotNull();
        // XPaths are normalized to lowercase, regex preserved as-is
        assertThat(retrieved.get().getMetadataRules().get("productcode").getXpaths())
            .containsExactly("/ceremony/productcode", "/alt/path");
        assertThat(retrieved.get().getMetadataRules().get("productcode").getValidationRegex())
            .isEqualTo("^[A-Z]{3}$");
    }

    @Test
    void metadataRulesRejectsUndeclaredField() {
        var rules = java.util.Map.of(
            "undeclaredfield", rule(List.of("/some/xpath"))
        );

        var dto = ContextDefinitionDTO.builder()
            .contextId("test-context")
            .displayName("Test Context")
            .description("Test description")
            .requiredMetadata(List.of("productcode"))
            .optionalMetadata(List.of("region"))
            .metadataRules(rules)
            .active(true)
            .build();

        assertThatThrownBy(() -> contextService.createContext(dto))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("undeclaredfield")
            .hasMessageContaining("not declared in required or optional metadata");
    }

    @Test
    void metadataRulesRejectsEmptyXPathList() {
        var rules = java.util.Map.of(
            "productcode", rule(List.of())  // Empty list
        );

        var dto = ContextDefinitionDTO.builder()
            .contextId("test-context")
            .displayName("Test Context")
            .description("Test description")
            .requiredMetadata(List.of("productcode"))
            .optionalMetadata(null)
            .metadataRules(rules)
            .active(true)
            .build();

        assertThatThrownBy(() -> contextService.createContext(dto))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("productcode")
            .hasMessageContaining("must have at least one XPath");
    }

    @Test
    void metadataRulesRejectsXPathNotStartingWithSlash() {
        var rules = java.util.Map.of(
            "productcode", rule(List.of("ceremony/productCode"))  // Missing leading /
        );

        var dto = ContextDefinitionDTO.builder()
            .contextId("test-context")
            .displayName("Test Context")
            .description("Test description")
            .requiredMetadata(List.of("productcode"))
            .optionalMetadata(null)
            .metadataRules(rules)
            .active(true)
            .build();

        assertThatThrownBy(() -> contextService.createContext(dto))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("productcode")
            .hasMessageContaining("must start with '/'");
    }

    @Test
    void metadataRulesAcceptsCaseInsensitiveFieldMatch() {
        // Field declared as lowercase, rule uses mixed case
        var rules = java.util.Map.of(
            "ProductCode", rule(List.of("/ceremony/productCode"))  // Mixed case key
        );

        var dto = ContextDefinitionDTO.builder()
            .contextId("test-context")
            .displayName("Test Context")
            .description("Test description")
            .requiredMetadata(List.of("productcode"))  // Lowercase
            .optionalMetadata(null)
            .metadataRules(rules)
            .active(true)
            .build();

        // Should not throw - case insensitive matching
        // Keys and XPaths are normalized to lowercase when stored
        Context created = contextService.createContext(dto);
        assertThat(created.getMetadataRules()).containsKey("productcode");
        assertThat(created.getMetadataRules().get("productcode").getXpaths())
            .containsExactly("/ceremony/productcode");
    }

    @Test
    void metadataRulesValidatedOnUpdate() {
        // Create context
        var initialDto = ContextDefinitionDTO.builder()
            .contextId("test-context")
            .displayName("Test Context")
            .description("Test description")
            .requiredMetadata(List.of("productcode"))
            .optionalMetadata(null)
            .metadataRules(null)
            .active(true)
            .build();
        contextService.createContext(initialDto);

        // Try to update with invalid rules
        var invalidRules = java.util.Map.of(
            "undeclaredfield", rule(List.of("/some/xpath"))
        );
        var updateDto = ContextDefinitionDTO.builder()
            .contextId("test-context")
            .displayName("Test Context")
            .description("Test description")
            .requiredMetadata(List.of("productcode"))
            .optionalMetadata(null)
            .metadataRules(invalidRules)
            .active(true)
            .build();

        assertThatThrownBy(() -> contextService.updateContext("test-context", updateDto))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("undeclaredfield")
            .hasMessageContaining("not declared in required or optional metadata");
    }

    // ===== VALIDATION REGEX TESTS =====

    @Test
    void metadataRulesWithValidRegex() {
        var rules = java.util.Map.of(
            "productcode", rule(List.of("/ceremony/productCode"), "^[A-Z]{3}$")
        );

        var dto = ContextDefinitionDTO.builder()
            .contextId("test-context")
            .displayName("Test Context")
            .description("Test description")
            .requiredMetadata(List.of("productcode"))
            .optionalMetadata(null)
            .metadataRules(rules)
            .active(true)
            .build();

        Context created = contextService.createContext(dto);

        assertThat(created.getMetadataRules().get("productcode").getValidationRegex())
            .isEqualTo("^[A-Z]{3}$");
    }

    @Test
    void metadataRulesWithNullRegexIsValid() {
        var rules = java.util.Map.of(
            "productcode", rule(List.of("/ceremony/productCode"), null)
        );

        var dto = ContextDefinitionDTO.builder()
            .contextId("test-context")
            .displayName("Test Context")
            .description("Test description")
            .requiredMetadata(List.of("productcode"))
            .optionalMetadata(null)
            .metadataRules(rules)
            .active(true)
            .build();

        Context created = contextService.createContext(dto);

        assertThat(created.getMetadataRules().get("productcode").getValidationRegex()).isNull();
    }

    @Test
    void metadataRulesRejectsInvalidRegex() {
        var rules = java.util.Map.of(
            "productcode", rule(List.of("/ceremony/productCode"), "[invalid(regex")  // Unclosed bracket
        );

        var dto = ContextDefinitionDTO.builder()
            .contextId("test-context")
            .displayName("Test Context")
            .description("Test description")
            .requiredMetadata(List.of("productcode"))
            .optionalMetadata(null)
            .metadataRules(rules)
            .active(true)
            .build();

        assertThatThrownBy(() -> contextService.createContext(dto))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("productcode")
            .hasMessageContaining("Invalid regex pattern");
    }

    @Test
    void metadataRulesWithComplexRegex() {
        // Test a more complex regex pattern
        var rules = java.util.Map.of(
            "productcode", rule(List.of("/ceremony/productCode"), "^(DDA|SAV|CD)[0-9]{2}[A-Z]?$")
        );

        var dto = ContextDefinitionDTO.builder()
            .contextId("test-context")
            .displayName("Test Context")
            .description("Test description")
            .requiredMetadata(List.of("productcode"))
            .optionalMetadata(null)
            .metadataRules(rules)
            .active(true)
            .build();

        Context created = contextService.createContext(dto);

        assertThat(created.getMetadataRules().get("productcode").getValidationRegex())
            .isEqualTo("^(DDA|SAV|CD)[0-9]{2}[A-Z]?$");
    }

    // ===== CONTEXT WITH COUNTS TESTS =====

    @Test
    void getAllContextsWithCountsReturnsCorrectCounts() {
        // Create multiple contexts
        var deposits = ContextDefinitionDTO.builder()
            .contextId("deposits")
            .displayName("Deposits")
            .description("Deposit processing")
            .requiredMetadata(List.of("productcode"))
            .optionalMetadata(null)
            .active(true)
            .build();
        contextService.createContext(deposits);

        var loans = ContextDefinitionDTO.builder()
            .contextId("loans")
            .displayName("Loans")
            .description("Loan processing")
            .requiredMetadata(List.of("loantype"))
            .optionalMetadata(null)
            .active(true)
            .build();
        contextService.createContext(loans);

        var empty = ContextDefinitionDTO.builder()
            .contextId("empty-context")
            .displayName("Empty")
            .description("No fields")
            .requiredMetadata(List.of("field"))
            .optionalMetadata(null)
            .active(true)
            .build();
        contextService.createContext(empty);

        // Add field observations to deposits (3 distinct fields)
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(Map.of("productcode", "DDA"), "/ceremony/amount", 1, false, false),
            new CatalogObservationDTO(Map.of("productcode", "DDA"), "/ceremony/date", 1, false, false),
            new CatalogObservationDTO(Map.of("productcode", "SAV"), "/ceremony/balance", 1, false, false)
        ));

        // Add field observations to loans (2 distinct fields)
        catalogService.merge("loans", List.of(
            new CatalogObservationDTO(Map.of("loantype", "MORTGAGE"), "/loan/principal", 1, false, false),
            new CatalogObservationDTO(Map.of("loantype", "MORTGAGE"), "/loan/rate", 1, false, false)
        ));

        // Get contexts with counts
        List<ContextWithCountDTO> results = contextService.getAllContextsWithCounts();

        assertThat(results).hasSize(3);

        // Find each context and verify counts
        var depositsResult = results.stream()
            .filter(c -> "deposits".equals(c.contextId()))
            .findFirst();
        assertThat(depositsResult).isPresent();
        assertThat(depositsResult.get().fieldCount()).isEqualTo(3);

        var loansResult = results.stream()
            .filter(c -> "loans".equals(c.contextId()))
            .findFirst();
        assertThat(loansResult).isPresent();
        assertThat(loansResult.get().fieldCount()).isEqualTo(2);

        var emptyResult = results.stream()
            .filter(c -> "empty-context".equals(c.contextId()))
            .findFirst();
        assertThat(emptyResult).isPresent();
        assertThat(emptyResult.get().fieldCount()).isEqualTo(0);
    }

    @Test
    void getAllContextsWithCountsHandlesNoContexts() {
        List<ContextWithCountDTO> results = contextService.getAllContextsWithCounts();
        assertThat(results).isEmpty();
    }

    @Test
    void getAllContextsWithCountsUsesAggregation() {
        // This test verifies that the aggregation approach works correctly
        // by creating many contexts and verifying all counts are retrieved in one call
        int contextCount = 10;

        for (int i = 0; i < contextCount; i++) {
            var dto = ContextDefinitionDTO.builder()
                .contextId("context-" + i)
                .displayName("Context " + i)
                .description("Description " + i)
                .requiredMetadata(List.of("field"))
                .optionalMetadata(null)
                .active(true)
                .build();
            contextService.createContext(dto);

            // Add i+1 fields to each context
            for (int j = 0; j <= i; j++) {
                catalogService.merge("context-" + i, List.of(
                    new CatalogObservationDTO(Map.of("field", "value"), "/path/field" + j, 1, false, false)
                ));
            }
        }

        List<ContextWithCountDTO> results = contextService.getAllContextsWithCounts();

        assertThat(results).hasSize(contextCount);

        // Verify each context has the correct count
        for (int i = 0; i < contextCount; i++) {
            final int index = i;
            var result = results.stream()
                .filter(c -> ("context-" + index).equals(c.contextId()))
                .findFirst();
            assertThat(result).isPresent();
            assertThat(result.get().fieldCount())
                .as("context-%d should have %d fields", i, i + 1)
                .isEqualTo(i + 1);
        }
    }
}