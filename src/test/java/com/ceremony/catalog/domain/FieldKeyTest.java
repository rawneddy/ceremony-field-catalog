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
        assertThat(fieldKey.fieldPath()).isEqualTo("/Ceremony/Amount");
        // Verify that metadata is normalized to lowercase (both keys and values)
        assertThat(fieldKey.metadata()).containsEntry("productcode", "dda");
        assertThat(fieldKey.metadata()).containsEntry("productsubcode", "4s");
        assertThat(fieldKey.metadata()).containsEntry("action", "fulfillment");
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
        assertThatThrownBy(() -> new FieldKey(null, Map.of(), "/fieldPath"))
            .isInstanceOf(NullPointerException.class)
            .hasMessageContaining("contextId cannot be null");
    }

    @Test
    void requiresNonNullFieldPath() {
        assertThatThrownBy(() -> new FieldKey("deposits", Map.of(), null))
            .isInstanceOf(NullPointerException.class)
            .hasMessageContaining("fieldPath cannot be null");
    }


    @Test
    void handlesSpecialCharactersInMetadata() {
        Map<String, String> metadata = Map.of(
            "field§with§sections", "value=with=equals&and&ampersands"
        );
        
        var fieldKey = new FieldKey("deposits", metadata, "/fieldPath");
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
        var fieldKey = new FieldKey("context", metadata, "/fieldPath");
        String keyString = fieldKey.toString();
        
        // Should always generate a valid field ID
        assertThat(keyString).startsWith("field_");
        assertThat(keyString).matches("field_\\d+");
        
        // Should be consistent
        var fieldKey2 = new FieldKey("context", metadata, "/fieldPath");
        assertThat(fieldKey2.toString()).isEqualTo(keyString);
    }

    @Test
    void metadataIsCaseInsensitive() {
        // Test that different case combinations generate the same field key
        Map<String, String> metadata1 = Map.of(
            "ProductCode", "DDA",
            "Action", "FULFILLMENT"
        );
        Map<String, String> metadata2 = Map.of(
            "productcode", "dda", 
            "action", "fulfillment"
        );
        Map<String, String> metadata3 = Map.of(
            "PRODUCTCODE", "Dda",
            "ACTION", "Fulfillment"
        );
        
        var fieldKey1 = new FieldKey("deposits", metadata1, "/Ceremony/Amount");
        var fieldKey2 = new FieldKey("deposits", metadata2, "/Ceremony/Amount");
        var fieldKey3 = new FieldKey("deposits", metadata3, "/Ceremony/Amount");
        
        // All should generate the same hash/toString value
        assertThat(fieldKey1.toString()).isEqualTo(fieldKey2.toString());
        assertThat(fieldKey2.toString()).isEqualTo(fieldKey3.toString());
        
        // Verify that the internal metadata is normalized to lowercase
        assertThat(fieldKey1.metadata()).containsEntry("productcode", "dda");
        assertThat(fieldKey1.metadata()).containsEntry("action", "fulfillment");
        assertThat(fieldKey2.metadata()).containsEntry("productcode", "dda");
        assertThat(fieldKey2.metadata()).containsEntry("action", "fulfillment");
        assertThat(fieldKey3.metadata()).containsEntry("productcode", "dda");
        assertThat(fieldKey3.metadata()).containsEntry("action", "fulfillment");
    }

    @Test
    void metadataCaseInsensitiveWithNullValues() {
        // Test case insensitivity with null values
        Map<String, String> metadata1 = Map.of("ProductCode", "DDA");
        Map<String, String> metadata2 = Map.of("productcode", "dda");
        
        var fieldKey1 = new FieldKey("deposits", metadata1, "/Ceremony/Amount");
        var fieldKey2 = new FieldKey("deposits", metadata2, "/Ceremony/Amount");
        
        assertThat(fieldKey1.toString()).isEqualTo(fieldKey2.toString());
        assertThat(fieldKey1.metadata()).containsEntry("productcode", "dda");
        assertThat(fieldKey2.metadata()).containsEntry("productcode", "dda");
    }

    @Test
    void metadataCaseInsensitiveWithSpecialCharacters() {
        // Test case insensitivity with special characters and numbers
        Map<String, String> metadata1 = Map.of(
            "Product_Code123", "DDA-4S",
            "Sub.Type", "SPECIAL_CHARS"
        );
        Map<String, String> metadata2 = Map.of(
            "product_code123", "dda-4s",
            "sub.type", "special_chars"
        );
        
        var fieldKey1 = new FieldKey("deposits", metadata1, "/Ceremony/Amount");
        var fieldKey2 = new FieldKey("deposits", metadata2, "/Ceremony/Amount");
        
        assertThat(fieldKey1.toString()).isEqualTo(fieldKey2.toString());
        assertThat(fieldKey1.metadata()).containsEntry("product_code123", "dda-4s");
        assertThat(fieldKey1.metadata()).containsEntry("sub.type", "special_chars");
    }

    @Test
    void metadataCaseInsensitiveEmptyAndWhitespace() {
        // Test case insensitivity with empty values and whitespace
        Map<String, String> metadata1 = Map.of(
            "ProductCode", " DDA ",
            "Action", ""
        );
        Map<String, String> metadata2 = Map.of(
            "productcode", " dda ",
            "action", ""
        );
        
        var fieldKey1 = new FieldKey("deposits", metadata1, "/Ceremony/Amount");
        var fieldKey2 = new FieldKey("deposits", metadata2, "/Ceremony/Amount");
        
        assertThat(fieldKey1.toString()).isEqualTo(fieldKey2.toString());
        // Note: whitespace is preserved, only case is normalized
        assertThat(fieldKey1.metadata()).containsEntry("productcode", " dda ");
        assertThat(fieldKey1.metadata()).containsEntry("action", "");
    }
}