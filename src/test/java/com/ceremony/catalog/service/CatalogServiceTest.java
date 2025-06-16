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
    
    @Test
    void minOccursDropsToZeroWhenFieldMissing() {
        // Setup context using helper
        createAndVerifyContext("deposits", "productCode", "productSubCode", "action");
        
        catalogService.merge("deposits", List.of(
            TestDataBuilder.depositsObservation()
                .withXpath("/Ceremony/FeeCode")
                .build()
        ));

        // Verify first field created using custom assertions
        var entries = catalogRepository.findAll();
        assertThat(entries).hasSize(1);
        TestAssertions.assertThat(entries.get(0))
            .hasXpath("/Ceremony/FeeCode")
            .hasContextId("deposits")
            .hasMinOccurs(1)
            .hasMaxOccurs(1);

        // Submit second observation missing the field - should set minOccurs to 0
        Map<String, String> metadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/Ceremony/DifferentField", 1, false, false)
        ));

        entries = catalogRepository.findAll();
        assertThat(entries).hasSize(2);
        
        var feeCodeEntry = entries.stream()
            .filter(e -> e.getXpath().equals("/Ceremony/FeeCode"))
            .findFirst()
            .orElseThrow();
        assertThat(feeCodeEntry.getMinOccurs()).isEqualTo(0); // Should be zero now
        assertThat(feeCodeEntry.getMaxOccurs()).isEqualTo(1); // Should remain 1
    }

    @Test
    void maxOccursIncreasesWhenHigherCountSeen() {
        createAndVerifyContext("deposits", "productCode", "productSubCode", "action");
        
        Map<String, String> metadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );

        // First observation with count 1
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/Ceremony/Amount", 1, false, false)
        ));

        var entry = catalogRepository.findAll().get(0);
        assertThat(entry.getMaxOccurs()).isEqualTo(1);

        // Second observation with count 5 should increase maxOccurs
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/Ceremony/Amount", 5, false, false)
        ));

        entry = catalogRepository.findAll().get(0);
        assertThat(entry.getMaxOccurs()).isEqualTo(5);
        assertThat(entry.getMinOccurs()).isEqualTo(1);
    }

    @Test
    void allowsNullAndEmptyFlagsAccumulate() {
        createAndVerifyContext("deposits", "productCode", "productSubCode", "action");
        
        Map<String, String> metadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );

        // First observation: no null, no empty
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/Ceremony/Name", 1, false, false)
        ));

        var entry = catalogRepository.findAll().get(0);
        assertThat(entry.isAllowsNull()).isFalse();
        assertThat(entry.isAllowsEmpty()).isFalse();

        // Second observation: has null
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/Ceremony/Name", 1, true, false)
        ));

        entry = catalogRepository.findAll().get(0);
        assertThat(entry.isAllowsNull()).isTrue();
        assertThat(entry.isAllowsEmpty()).isFalse();

        // Third observation: has empty
        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/Ceremony/Name", 1, false, true)
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
        createAndVerifyContext("deposits", "productCode", "productSubCode", "action");
        
        // Missing required productCode field
        Map<String, String> incompleteMetadata = Map.of(
            "productSubCode", "4S",
            "action", "Fulfillment"
        );
        
        assertThatThrownBy(() -> 
            catalogService.merge("deposits", List.of(
                new CatalogObservationDTO(incompleteMetadata, "/Test/Path", 1, false, false)
            ))
        ).isInstanceOf(IllegalArgumentException.class)
         .hasMessageContaining("Required metadata field missing: productCode");
    }

    @Test
    void failsWhenUnexpectedMetadataProvided() {
        createAndVerifyContext("deposits", "productCode", "productSubCode", "action");
        
        // Contains unexpected field
        Map<String, String> invalidMetadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S", 
            "action", "Fulfillment",
            "unexpectedField", "value"
        );
        
        assertThatThrownBy(() -> 
            catalogService.merge("deposits", List.of(
                new CatalogObservationDTO(invalidMetadata, "/Test/Path", 1, false, false)
            ))
        ).isInstanceOf(IllegalArgumentException.class)
         .hasMessageContaining("Unexpected metadata field: unexpectedField");
    }

    @Test
    void searchFindsFieldsByContext() {
        createAndVerifyContext("deposits", "productCode", "productSubCode", "action");
        
        Map<String, String> metadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );

        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/Ceremony/Amount", 1, false, false),
            new CatalogObservationDTO(metadata, "/Ceremony/Name", 1, false, false)
        ));

        var criteria = new CatalogSearchCriteria("deposits", null, null);
        Page<CatalogEntry> results = catalogService.find(criteria, PageRequest.of(0, 10));

        assertThat(results.getContent()).hasSize(2);
        assertThat(results.getContent().stream().map(CatalogEntry::getXpath))
            .containsExactlyInAnyOrder("/Ceremony/Amount", "/Ceremony/Name");
    }

    @Test
    void searchFindsByXpathPattern() {
        createAndVerifyContext("deposits", "productCode", "productSubCode", "action");
        
        Map<String, String> metadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );

        catalogService.merge("deposits", List.of(
            new CatalogObservationDTO(metadata, "/Ceremony/FeeCode", 1, false, false),
            new CatalogObservationDTO(metadata, "/Ceremony/Amount", 1, false, false)
        ));

        var criteria = new CatalogSearchCriteria(null, null, "Fee");
        Page<CatalogEntry> results = catalogService.find(criteria, PageRequest.of(0, 10));

        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).getXpath()).isEqualTo("/Ceremony/FeeCode");
    }
}