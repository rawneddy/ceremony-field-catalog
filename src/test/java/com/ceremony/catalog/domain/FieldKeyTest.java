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
        
        var fieldKey = new FieldKey("deposits", metadata, "data", "/Ceremony/Amount");
        
        assertThat(fieldKey.contextId()).isEqualTo("deposits");
        assertThat(fieldKey.xpath()).isEqualTo("/Ceremony/Amount");
        assertThat(fieldKey.dataType()).isEqualTo("data");
        assertThat(fieldKey.metadata()).containsAllEntriesOf(metadata);
    }

    @Test
    void toStringGeneratesUniqueIdentifier() {
        Map<String, String> metadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );
        
        var fieldKey1 = new FieldKey("deposits", metadata, "data", "/Ceremony/Amount");
        var fieldKey2 = new FieldKey("deposits", metadata, "data", "/Ceremony/Amount");
        
        assertThat(fieldKey1.toString()).isEqualTo(fieldKey2.toString());
    }

    @Test
    void toStringDifferentForDifferentKeys() {
        Map<String, String> metadata1 = Map.of("productCode", "DDA");
        Map<String, String> metadata2 = Map.of("productCode", "SAV");
        
        var fieldKey1 = new FieldKey("deposits", metadata1, "data", "/Ceremony/Amount");
        var fieldKey2 = new FieldKey("deposits", metadata2, "data", "/Ceremony/Amount");
        
        assertThat(fieldKey1.toString()).isNotEqualTo(fieldKey2.toString());
    }

    @Test
    void handlesNullMetadata() {
        var fieldKey = new FieldKey("deposits", null, "data", "/Ceremony/Amount");
        
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
        
        var fieldKey1 = new FieldKey("deposits", metadata1, "data", "/Ceremony/Amount");
        var fieldKey2 = new FieldKey("deposits", metadata2, "data", "/Ceremony/Amount");
        
        assertThat(fieldKey1.toString()).isEqualTo(fieldKey2.toString());
    }

    @Test
    void requiresNonNullContextId() {
        assertThatThrownBy(() -> new FieldKey(null, Map.of(), "data", "/xpath"))
            .isInstanceOf(NullPointerException.class)
            .hasMessageContaining("contextId cannot be null");
    }

    @Test
    void requiresNonNullXpath() {
        assertThatThrownBy(() -> new FieldKey("deposits", Map.of(), "data", null))
            .isInstanceOf(NullPointerException.class)
            .hasMessageContaining("xpath cannot be null");
    }

    @Test
    void requiresNonNullDataType() {
        assertThatThrownBy(() -> new FieldKey("deposits", Map.of(), null, "/xpath"))
            .isInstanceOf(NullPointerException.class)
            .hasMessageContaining("dataType cannot be null");
    }

    @Test
    void escapesSpecialCharactersInToString() {
        Map<String, String> metadata = Map.of(
            "field§with§sections", "value=with=equals&and&ampersands"
        );
        
        var fieldKey = new FieldKey("deposits", metadata, "data", "/xpath");
        String keyString = fieldKey.toString();
        
        // Should contain escaped characters (double escaping due to key=value format)
        assertThat(keyString).contains("field§§§§with§§§§sections");
        assertThat(keyString).contains("value====with====equals&&&&and&&&&ampersands");
    }
}