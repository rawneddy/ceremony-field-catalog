package com.ceremony.catalog.service;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.api.dto.CatalogSearchCriteria;
import com.ceremony.catalog.base.ServiceTestBase;
import com.ceremony.catalog.domain.CatalogEntry;
import com.ceremony.catalog.util.TestAssertions;
import com.ceremony.catalog.util.TestDataBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CatalogServiceTest extends ServiceTestBase {
    
    // Base class provides setup and cleanup
    
    /**
     * Helper method to create a context with both required and optional metadata fields
     */
    private void createContext(String contextId, List<String> requiredFields, List<String> optionalFields) {
        var contextDef = new com.ceremony.catalog.api.dto.ContextDefinitionDTO(
            contextId,
            contextId + " Test Context",
            "Test context for " + contextId,
            requiredFields,
            optionalFields,
            true
        );
        contextService.createContext(contextDef);
    }
    
    @Test
    void minOccursDropsToZeroWhenFieldMissing() {
        // Setup context using helper
        createAndVerifyContext("deposits", "productcode", "productsubcode", "action");

        // Submit with mixed case - API normalizes to lowercase
        catalogService.merge("deposits", List.of(
            TestDataBuilder.depositsObservation()
                .withFieldPath("/Ceremony/FeeCode")  // Mixed case input
                .build()
        ));

        // Verify field created with lowercase path
        var entries = catalogRepository.findAll();
        assertThat(entries).hasSize(1);
        TestAssertions.assertThat(entries.get(0))
            .hasFieldPath("/ceremony/feecode")  // Lowercased
            .hasContextId("deposits")
            .hasMinOccurs(1)
            .hasMaxOccurs(1);

        // Submit second observation missing the field - should set minOccurs to 0
        Map<String, String> metadata = Map.of(
            "productcode", "dda",
            "productsubcode", "4s",
            "action", "fulfillment"
        );
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/Ceremony/DifferentField", 1, false, false)  // Mixed case
        ));

        entries = catalogRepository.findAll();
        assertThat(entries).hasSize(2);

        var feeCodeEntry = entries.stream()
            .filter(e -> e.getFieldPath().equals("/ceremony/feecode"))  // Lowercased
            .findFirst()
            .orElseThrow();
        assertThat(feeCodeEntry.getMinOccurs()).isEqualTo(0); // Should be zero now
        assertThat(feeCodeEntry.getMaxOccurs()).isEqualTo(1); // Should remain 1
    }

    @Test
    void maxOccursIncreasesWhenHigherCountSeen() {
        createAndVerifyContext("deposits", "productcode", "productsubcode", "action");
        
        Map<String, String> metadata = Map.of(
            "productcode", "dda",
            "productsubcode", "4s",
            "action", "fulfillment"
        );

        // First observation with count 1
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/ceremony/amount", 1, false, false)
        ));

        var entry = catalogRepository.findAll().get(0);
        assertThat(entry.getMaxOccurs()).isEqualTo(1);

        // Second observation with count 5 should increase maxOccurs
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/ceremony/amount", 5, false, false)
        ));

        entry = catalogRepository.findAll().get(0);
        assertThat(entry.getMaxOccurs()).isEqualTo(5);
        assertThat(entry.getMinOccurs()).isEqualTo(1);
    }

    @Test
    void allowsNullAndEmptyFlagsAccumulate() {
        createAndVerifyContext("deposits", "productcode", "productsubcode", "action");
        
        Map<String, String> metadata = Map.of(
            "productcode", "dda",
            "productsubcode", "4s",
            "action", "fulfillment"
        );

        // First observation: no null, no empty
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/ceremony/name", 1, false, false)
        ));

        var entry = catalogRepository.findAll().get(0);
        assertThat(entry.isAllowsNull()).isFalse();
        assertThat(entry.isAllowsEmpty()).isFalse();

        // Second observation: has null
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/ceremony/name", 1, true, false)
        ));

        entry = catalogRepository.findAll().get(0);
        assertThat(entry.isAllowsNull()).isTrue();
        assertThat(entry.isAllowsEmpty()).isFalse();

        // Third observation: has empty
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/ceremony/name", 1, false, true)
        ));

        entry = catalogRepository.findAll().get(0);
        assertThat(entry.isAllowsNull()).isTrue();
        assertThat(entry.isAllowsEmpty()).isTrue();
    }

    @Test
    void failsWhenContextDoesNotExist() {
        Map<String, String> metadata = Map.of("someField", "someValue");
        
        assertThatThrownBy(() -> 
            catalogService.merge("nonexistent", List.of(
                new CatalogObservationDTO(metadata, "/Test/Path", 1, false, false)
            ))
        ).isInstanceOf(IllegalArgumentException.class)
         .hasMessageContaining("Context not found or inactive: nonexistent");
    }

    @Test
    void failsWhenRequiredMetadataMissing() {
        createAndVerifyContext("deposits", "productcode", "productsubcode", "action");
        
        // Missing required productcode field
        Map<String, String> incompleteMetadata = Map.of(
            "productsubcode", "4S",
            "action", "Fulfillment"
        );
        
        assertThatThrownBy(() -> 
            catalogService.merge("deposits", List.of(
                new CatalogObservationDTO(incompleteMetadata, "/Test/Path", 1, false, false)
            ))
        ).isInstanceOf(IllegalArgumentException.class)
         .hasMessageContaining("Required metadata field missing: productcode");
    }

    @Test
    void failsWhenUnexpectedMetadataProvided() {
        createAndVerifyContext("deposits", "productcode", "productsubcode", "action");
        
        // Contains unexpected field
        Map<String, String> invalidMetadata = Map.of(
            "productcode", "dda",
            "productsubcode", "4s", 
            "action", "fulfillment",
            "unexpectedField", "value"
        );
        
        assertThatThrownBy(() -> 
            catalogService.merge("deposits", List.of(
                new CatalogObservationDTO(invalidMetadata, "/Test/Path", 1, false, false)
            ))
        ).isInstanceOf(IllegalArgumentException.class)
         .hasMessageContaining("Unexpected metadata field: unexpectedfield");
    }

    @Test
    void searchFindsFieldsByContext() {
        createAndVerifyContext("deposits", "productcode", "productsubcode", "action");
        
        Map<String, String> metadata = Map.of(
            "productcode", "dda",
            "productsubcode", "4s",
            "action", "fulfillment"
        );

        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/ceremony/amount", 1, false, false),
            new CatalogObservationDTO(metadata, "/ceremony/name", 1, false, false)
        ));

        var criteria = new CatalogSearchCriteria("deposits", null, null);
        Page<CatalogEntry> results = catalogService.find(criteria, PageRequest.of(0, 10));

        assertThat(results.getContent()).hasSize(2);
        assertThat(results.getContent().stream().map(CatalogEntry::getFieldPath))
            .containsExactlyInAnyOrder("/ceremony/amount", "/ceremony/name");
    }

    @Test
    void searchFindsByFieldPathPattern() {
        createAndVerifyContext("deposits", "productcode", "productsubcode", "action");
        
        Map<String, String> metadata = Map.of(
            "productcode", "dda",
            "productsubcode", "4s",
            "action", "fulfillment"
        );

        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/ceremony/feecode", 1, false, false),
            new CatalogObservationDTO(metadata, "/ceremony/amount", 1, false, false)
        ));

        var criteria = new CatalogSearchCriteria(null, null, "/ceremony/feecode");
        Page<CatalogEntry> results = catalogService.find(criteria, PageRequest.of(0, 10));

        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).getFieldPath()).isEqualTo("/ceremony/feecode");
    }

    // ===== CASE-INSENSITIVE METADATA TESTS =====

    @Test
    void acceptsObservationWithMixedCaseRequiredMetadata() {
        // Context defines required metadata in lowercase
        createAndVerifyContext("deposits", "productcode", "action");
        
        // Submit observation with mixed case metadata - should succeed
        Map<String, String> mixedCaseMetadata = Map.of(
            "ProductCode", "DDA",  // uppercase first letter
            "ACTION", "Fulfillment"  // all uppercase
        );

        // Should not throw an exception
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(mixedCaseMetadata, "/ceremony/amount", 1, false, false)
        ));

        var entries = catalogRepository.findAll();
        assertThat(entries).hasSize(1);
        
        // Verify metadata is stored in normalized lowercase form
        var entry = entries.get(0);
        assertThat(entry.getMetadata()).containsEntry("productcode", "dda");
        assertThat(entry.getMetadata()).containsEntry("action", "fulfillment");
    }

    @Test
    void acceptsObservationWithAllUppercaseRequiredMetadata() {
        createAndVerifyContext("deposits", "productcode", "action");
        
        Map<String, String> uppercaseMetadata = Map.of(
            "PRODUCTCODE", "DDA",
            "ACTION", "FULFILLMENT"
        );

        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(uppercaseMetadata, "/ceremony/amount", 1, false, false)
        ));

        var entries = catalogRepository.findAll();
        assertThat(entries).hasSize(1);
        
        var entry = entries.get(0);
        assertThat(entry.getMetadata()).containsEntry("productcode", "dda");
        assertThat(entry.getMetadata()).containsEntry("action", "fulfillment");
    }

    @Test
    void failsWhenRequiredMetadataMissingDespiteCaseVariations() {
        createAndVerifyContext("deposits", "productcode", "action");
        
        // Submit observation missing required field (even with case variations)
        Map<String, String> incompleteMetadata = Map.of(
            "ProductCode", "DDA"
            // Missing "action" field
        );

        assertThatThrownBy(() -> 
            catalogService.merge("deposits", List.of(
                new CatalogObservationDTO(incompleteMetadata, "/ceremony/amount", 1, false, false)
            ))
        ).isInstanceOf(IllegalArgumentException.class)
         .hasMessageContaining("Required metadata field missing: action");
    }

    @Test
    void rejectsUnexpectedMetadataFieldsRegardlessOfCase() {
        createAndVerifyContext("deposits", "productcode", "action");
        
        Map<String, String> metadataWithUnexpectedField = Map.of(
            "ProductCode", "DDA",
            "Action", "Fulfillment",
            "UnexpectedField", "SomeValue"  // This should cause validation to fail
        );

        assertThatThrownBy(() -> 
            catalogService.merge("deposits", List.of(
                new CatalogObservationDTO(metadataWithUnexpectedField, "/ceremony/amount", 1, false, false)
            ))
        ).isInstanceOf(IllegalArgumentException.class)
         .hasMessageContaining("Unexpected metadata field: unexpectedfield");
    }

    @Test
    void mergesSameFieldsWithDifferentMetadataCasing() {
        createAndVerifyContext("deposits", "productcode", "action");
        
        // First observation with lowercase metadata
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(
                Map.of("productcode", "dda", "action", "fulfillment"),
                "/ceremony/amount", 
                1, false, false
            )
        ));

        // Second observation with uppercase metadata for same field
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(
                Map.of("PRODUCTCODE", "DDA", "ACTION", "FULFILLMENT"),
                "/ceremony/amount", 
                2, false, false
            )
        ));

        // Should have merged into single entry (not created separate entries)
        var entries = catalogRepository.findAll();
        assertThat(entries).hasSize(1);
        
        var entry = entries.get(0);
        assertThat(entry.getMaxOccurs()).isEqualTo(2);  // Should have updated
        assertThat(entry.getMinOccurs()).isEqualTo(1);
        assertThat(entry.getMetadata()).containsEntry("productcode", "dda");
        assertThat(entry.getMetadata()).containsEntry("action", "fulfillment");
    }

    @Test
    void handlesOptionalMetadataWithCaseVariations() {
        // Create context with both required and optional metadata
        createContext("deposits", List.of("productcode"), List.of("subcategory"));
        
        // Submit observation with mixed case optional metadata
        Map<String, String> metadata = Map.of(
            "ProductCode", "dda",  // required field
            "SubCategory", "premium"  // optional field with different case
        );

        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/ceremony/amount", 1, false, false)
        ));

        var entries = catalogRepository.findAll();
        assertThat(entries).hasSize(1);
        
        var entry = entries.get(0);
        assertThat(entry.getMetadata()).containsEntry("productcode", "dda");
        assertThat(entry.getMetadata()).containsEntry("subcategory", "premium");
    }

    @Test
    void searchWorksWithCaseInsensitiveMetadata() {
        createAndVerifyContext("deposits", "productcode", "action");
        
        // Submit observations with different case metadata
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(
                Map.of("ProductCode", "dda", "Action", "fulfillment"),
                "/ceremony/amount", 
                1, false, false
            ),
            new CatalogObservationDTO(
                Map.of("productcode", "sav", "action", "inquiry"),
                "/ceremony/balance", 
                1, false, false
            )
        ));

        // Search with lowercase metadata should find both
        var searchMetadata = Map.of("productcode", "dda");
        var criteria = new CatalogSearchCriteria("deposits", searchMetadata, null);
        Page<CatalogEntry> results = catalogService.find(criteria, PageRequest.of(0, 10));

        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).getFieldPath()).isEqualTo("/ceremony/amount");
    }
}