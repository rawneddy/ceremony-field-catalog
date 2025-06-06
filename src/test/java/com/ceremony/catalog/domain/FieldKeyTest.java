package com.ceremony.catalog.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FieldKeyTest {

    @Test
    void createsValidFieldKey() {
        var fieldKey = new FieldKey(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null,
            "data", "/Ceremony/Amount"
        );
        
        assertThat(fieldKey.pathType()).isEqualTo("deposits");
        assertThat(fieldKey.xpath()).isEqualTo("/Ceremony/Amount");
        assertThat(fieldKey.dataType()).isEqualTo("data");
    }

    @Test
    void toStringGeneratesUniqueIdentifier() {
        var fieldKey1 = new FieldKey(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null,
            "data", "/Ceremony/Amount"
        );
        
        var fieldKey2 = new FieldKey(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null,
            "data", "/Ceremony/FeeCode"
        );
        
        assertThat(fieldKey1.toString()).isNotEqualTo(fieldKey2.toString());
        assertThat(fieldKey1.toString()).contains("deposits");
        assertThat(fieldKey1.toString()).contains("/Ceremony/Amount");
    }

    @Test
    void toStringHandlesNullValues() {
        var fieldKey = new FieldKey(
            "loans", null, null, null, null, null, "HEQF",
            "data", "/BMIC/Application/FICO"
        );
        
        String result = fieldKey.toString();
        assertThat(result).contains("loans");
        assertThat(result).contains("HEQF");
        assertThat(result).contains("/BMIC/Application/FICO");
        assertThat(result).doesNotContain("null");
    }

    @Test
    void toStringEscapesDelimiterCharacters() {
        var fieldKey = new FieldKey(
            "deposits", "D§DA", "4S", "Fulfillment", "DDA", "4S", null,
            "data", "/Ceremony/Amount"
        );
        
        String result = fieldKey.toString();
        assertThat(result).contains("D§§DA"); // Should be escaped
    }

    @Test
    void equalsAndHashCodeWorkCorrectly() {
        var fieldKey1 = new FieldKey(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null,
            "data", "/Ceremony/Amount"
        );
        
        var fieldKey2 = new FieldKey(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null,
            "data", "/Ceremony/Amount"
        );
        
        var fieldKey3 = new FieldKey(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null,
            "data", "/Ceremony/FeeCode"
        );
        
        assertThat(fieldKey1).isEqualTo(fieldKey2);
        assertThat(fieldKey1).isNotEqualTo(fieldKey3);
        assertThat(fieldKey1.hashCode()).isEqualTo(fieldKey2.hashCode());
    }

    @Test
    void throwsExceptionForNullPathType() {
        assertThatThrownBy(() -> new FieldKey(
            null, "DDA", "4S", "Fulfillment", "DDA", "4S", null,
            "data", "/Ceremony/Amount"
        )).isInstanceOf(NullPointerException.class)
          .hasMessageContaining("pathType cannot be null");
    }

    @Test
    void throwsExceptionForNullXpath() {
        assertThatThrownBy(() -> new FieldKey(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null,
            "data", null
        )).isInstanceOf(NullPointerException.class)
          .hasMessageContaining("xpath cannot be null");
    }

    @Test
    void throwsExceptionForNullDataType() {
        assertThatThrownBy(() -> new FieldKey(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null,
            null, "/Ceremony/Amount"
        )).isInstanceOf(NullPointerException.class)
          .hasMessageContaining("dataType cannot be null");
    }

    @Test
    void handlesLoansPathTypeCorrectly() {
        var fieldKey = new FieldKey(
            "loans", null, null, null, null, null, "HEQF",
            "data", "/BMIC/Application/FICO"
        );
        
        assertThat(fieldKey.pathType()).isEqualTo("loans");
        assertThat(fieldKey.loanProductCode()).isEqualTo("HEQF");
        assertThat(fieldKey.formCode()).isNull();
        assertThat(fieldKey.action()).isNull();
    }

    @Test
    void handlesOnDemandPathTypeCorrectly() {
        var fieldKey = new FieldKey(
            "ondemand", "ACK123", "v1.0", null, null, null, null,
            "data", "/eDocument/PrimaryCustomer/Name/First"
        );
        
        assertThat(fieldKey.pathType()).isEqualTo("ondemand");
        assertThat(fieldKey.formCode()).isEqualTo("ACK123");
        assertThat(fieldKey.formVersion()).isEqualTo("v1.0");
        assertThat(fieldKey.loanProductCode()).isNull();
        assertThat(fieldKey.action()).isNull();
    }
}