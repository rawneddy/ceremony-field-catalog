package com.ceremony.catalog.domain;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ContextKeyTest {

    @Test
    void createsValidContextKey() {
        Map<String, String> metadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );
        
        var contextKey = new ContextKey("deposits", metadata);
        
        assertThat(contextKey.contextId()).isEqualTo("deposits");
        assertThat(contextKey.metadata()).containsAllEntriesOf(metadata);
    }

    @Test
    void toStringGeneratesUniqueIdentifier() {
        Map<String, String> metadata1 = Map.of("action", "Fulfillment");
        Map<String, String> metadata2 = Map.of("action", "Processing");
        
        var contextKey1 = new ContextKey("deposits", metadata1);
        var contextKey2 = new ContextKey("deposits", metadata2);
        
        assertThat(contextKey1.toString()).isNotEqualTo(contextKey2.toString());
        assertThat(contextKey1.toString()).contains("Fulfillment");
        assertThat(contextKey2.toString()).contains("Processing");
    }

    @Test
    void toStringHandlesNullMetadata() {
        var contextKey = new ContextKey("loans", null);
        
        String result = contextKey.toString();
        assertThat(result).contains("loans");
        assertThat(result).doesNotContain("null");
    }

    @Test
    void toStringEscapesSpecialCharacters() {
        Map<String, String> metadata = Map.of(
            "field§with§sections", "value=with=equals&and&ampersands"
        );
        
        var contextKey = new ContextKey("deposits", metadata);
        
        String result = contextKey.toString();
        assertThat(result).contains("field§§§§with§§§§sections");
        assertThat(result).contains("value====with====equals&&&&and&&&&ampersands");
    }

    @Test
    void sortedMetadataForConsistentKeys() {
        Map<String, String> metadata1 = Map.of(
            "productCode", "DDA",
            "action", "Fulfillment"
        );
        Map<String, String> metadata2 = Map.of(
            "action", "Fulfillment",
            "productCode", "DDA"
        );
        
        var contextKey1 = new ContextKey("deposits", metadata1);
        var contextKey2 = new ContextKey("deposits", metadata2);
        
        assertThat(contextKey1.toString()).isEqualTo(contextKey2.toString());
    }

    @Test
    void equalsAndHashCodeWorkCorrectly() {
        Map<String, String> metadata = Map.of("productCode", "DDA");
        
        var contextKey1 = new ContextKey("deposits", metadata);
        var contextKey2 = new ContextKey("deposits", metadata);
        var contextKey3 = new ContextKey("loans", metadata);
        
        assertThat(contextKey1).isEqualTo(contextKey2);
        assertThat(contextKey1).isNotEqualTo(contextKey3);
        assertThat(contextKey1.hashCode()).isEqualTo(contextKey2.hashCode());
    }

    @Test
    void throwsExceptionForNullContextId() {
        assertThatThrownBy(() -> new ContextKey(null, Map.of()))
            .isInstanceOf(NullPointerException.class)
            .hasMessageContaining("contextId cannot be null");
    }

    @Test
    void handlesLoansContextCorrectly() {
        Map<String, String> metadata = Map.of("loanProductCode", "HEQF");
        var contextKey = new ContextKey("loans", metadata);
        
        assertThat(contextKey.contextId()).isEqualTo("loans");
        assertThat(contextKey.metadata()).containsEntry("loanProductCode", "HEQF");
    }

    @Test
    void handlesOnDemandContextCorrectly() {
        Map<String, String> metadata = Map.of(
            "formCode", "ACK123",
            "formVersion", "v1.0"
        );
        var contextKey = new ContextKey("ondemand", metadata);
        
        assertThat(contextKey.contextId()).isEqualTo("ondemand");
        assertThat(contextKey.metadata()).containsEntry("formCode", "ACK123");
        assertThat(contextKey.metadata()).containsEntry("formVersion", "v1.0");
    }

    @Test
    void handlesDepositsContextCorrectly() {
        Map<String, String> metadata = Map.of(
            "action", "Fulfillment",
            "productCode", "DDA",
            "productSubCode", "4S"
        );
        var contextKey = new ContextKey("deposits", metadata);
        
        assertThat(contextKey.contextId()).isEqualTo("deposits");
        assertThat(contextKey.metadata()).containsEntry("action", "Fulfillment");
        assertThat(contextKey.metadata()).containsEntry("productCode", "DDA");
        assertThat(contextKey.metadata()).containsEntry("productSubCode", "4S");
    }

    @Test
    void handlesRenderDataContextCorrectly() {
        Map<String, String> metadata = Map.of(
            "documentCode", "STMT001",
            "productCode", "DDA"
        );
        var contextKey = new ContextKey("renderdata", metadata);
        
        assertThat(contextKey.contextId()).isEqualTo("renderdata");
        assertThat(contextKey.metadata()).containsEntry("documentCode", "STMT001");
        assertThat(contextKey.metadata()).containsEntry("productCode", "DDA");
    }
}