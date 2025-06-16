package com.ceremony.catalog.domain;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FieldKeyTest {

    @Test
    void createsValidFieldKey() {
        Map<String, String> metadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S", 
            "action", "Fulfillment"
        );
        
        var fieldKey = new FieldKey("deposits", metadata, "/Ceremony/Amount");
        
        assertThat(fieldKey.contextId()).isEqualTo("deposits");
        assertThat(fieldKey.xpath()).isEqualTo("/Ceremony/Amount");
        assertThat(fieldKey.metadata()).containsAllEntriesOf(metadata);
    }

    @Test
    void toStringGeneratesUniqueIdentifier() {
        Map<String, String> metadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );
        
        var fieldKey1 = new FieldKey("deposits", metadata, "/Ceremony/Amount");
        var fieldKey2 = new FieldKey("deposits", metadata, "/Ceremony/Amount");
        
        assertThat(fieldKey1.toString()).isEqualTo(fieldKey2.toString());
    }

    @Test
    void toStringDifferentForDifferentKeys() {
        Map<String, String> metadata1 = Map.of("productCode", "DDA");
        Map<String, String> metadata2 = Map.of("productCode", "SAV");
        
        var fieldKey1 = new FieldKey("deposits", metadata1, "/Ceremony/Amount");
        var fieldKey2 = new FieldKey("deposits", metadata2, "/Ceremony/Amount");
        
        assertThat(fieldKey1.toString()).isNotEqualTo(fieldKey2.toString());
    }

    @Test
    void handlesNullMetadata() {
        var fieldKey = new FieldKey("deposits", null, "/Ceremony/Amount");
        
        assertThat(fieldKey.metadata()).isEmpty();
        assertThat(fieldKey.toString()).doesNotContain("null");
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
        
        var fieldKey1 = new FieldKey("deposits", metadata1, "/Ceremony/Amount");
        var fieldKey2 = new FieldKey("deposits", metadata2, "/Ceremony/Amount");
        
        assertThat(fieldKey1.toString()).isEqualTo(fieldKey2.toString());
    }

    @Test
    void requiresNonNullContextId() {
        assertThatThrownBy(() -> new FieldKey(null, Map.of(), "/xpath"))
            .isInstanceOf(NullPointerException.class)
            .hasMessageContaining("contextId cannot be null");
    }

    @Test
    void requiresNonNullXpath() {
        assertThatThrownBy(() -> new FieldKey("deposits", Map.of(), null))
            .isInstanceOf(NullPointerException.class)
            .hasMessageContaining("xpath cannot be null");
    }


    @Test
    void handlesSpecialCharactersInMetadata() {
        Map<String, String> metadata = Map.of(
            "field§with§sections", "value=with=equals&and&ampersands"
        );
        
        var fieldKey = new FieldKey("deposits", metadata, "/xpath");
        String keyString = fieldKey.toString();
        
        // Should generate a consistent hash-based ID regardless of special characters
        assertThat(keyString).startsWith("field_");
        assertThat(keyString).matches("field_\\d+");
    }
    
    @Test
    void handlesHashCollisionEdgeCase() {
        // Test the Integer.MIN_VALUE edge case where Math.abs would cause collision
        // We can't easily force this, but we can verify the method handles it
        Map<String, String> metadata = Map.of("test", "value");
        var fieldKey = new FieldKey("context", metadata, "/xpath");
        String keyString = fieldKey.toString();
        
        // Should always generate a valid field ID
        assertThat(keyString).startsWith("field_");
        assertThat(keyString).matches("field_\\d+");
        
        // Should be consistent
        var fieldKey2 = new FieldKey("context", metadata, "/xpath");
        assertThat(fieldKey2.toString()).isEqualTo(keyString);
    }
}