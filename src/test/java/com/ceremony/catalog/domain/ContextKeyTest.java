package com.ceremony.catalog.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ContextKeyTest {

    @Test
    void createsValidContextKey() {
        var contextKey = new ContextKey(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null
        );
        
        assertThat(contextKey.pathType()).isEqualTo("deposits");
        assertThat(contextKey.formCode()).isEqualTo("DDA");
        assertThat(contextKey.action()).isEqualTo("Fulfillment");
    }

    @Test
    void toStringGeneratesUniqueIdentifier() {
        var contextKey1 = new ContextKey(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null
        );
        
        var contextKey2 = new ContextKey(
            "deposits", "DDA", "4S", "Processing", "DDA", "4S", null
        );
        
        assertThat(contextKey1.toString()).isNotEqualTo(contextKey2.toString());
        assertThat(contextKey1.toString()).contains("Fulfillment");
        assertThat(contextKey2.toString()).contains("Processing");
    }

    @Test
    void toStringHandlesNullValues() {
        var contextKey = new ContextKey(
            "loans", null, null, null, null, null, "HEQF"
        );
        
        String result = contextKey.toString();
        assertThat(result).contains("loans");
        assertThat(result).contains("HEQF");
        assertThat(result).doesNotContain("null");
    }

    @Test
    void toStringEscapesDelimiterCharacters() {
        var contextKey = new ContextKey(
            "deposits", "D§DA", "4S", "Fulfillment", "DDA", "4S", null
        );
        
        String result = contextKey.toString();
        assertThat(result).contains("D§§DA"); // Should be escaped
    }

    @Test
    void equalsAndHashCodeWorkCorrectly() {
        var contextKey1 = new ContextKey(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null
        );
        
        var contextKey2 = new ContextKey(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null
        );
        
        var contextKey3 = new ContextKey(
            "deposits", "DDA", "4S", "Processing", "DDA", "4S", null
        );
        
        assertThat(contextKey1).isEqualTo(contextKey2);
        assertThat(contextKey1).isNotEqualTo(contextKey3);
        assertThat(contextKey1.hashCode()).isEqualTo(contextKey2.hashCode());
    }

    @Test
    void throwsExceptionForNullPathType() {
        assertThatThrownBy(() -> new ContextKey(
            null, "DDA", "4S", "Fulfillment", "DDA", "4S", null
        )).isInstanceOf(NullPointerException.class)
          .hasMessageContaining("pathType cannot be null");
    }

    @Test
    void handlesLoansPathTypeCorrectly() {
        var contextKey = new ContextKey(
            "loans", null, null, null, null, null, "HEQF"
        );
        
        assertThat(contextKey.pathType()).isEqualTo("loans");
        assertThat(contextKey.loanProductCode()).isEqualTo("HEQF");
        assertThat(contextKey.formCode()).isNull();
        assertThat(contextKey.action()).isNull();
    }

    @Test
    void handlesOnDemandPathTypeCorrectly() {
        var contextKey = new ContextKey(
            "ondemand", "ACK123", "v1.0", null, null, null, null
        );
        
        assertThat(contextKey.pathType()).isEqualTo("ondemand");
        assertThat(contextKey.formCode()).isEqualTo("ACK123");
        assertThat(contextKey.formVersion()).isEqualTo("v1.0");
        assertThat(contextKey.loanProductCode()).isNull();
        assertThat(contextKey.action()).isNull();
    }

    @Test
    void handlesDepositsPathTypeCorrectly() {
        var contextKey = new ContextKey(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null
        );
        
        assertThat(contextKey.pathType()).isEqualTo("deposits");
        assertThat(contextKey.action()).isEqualTo("Fulfillment");
        assertThat(contextKey.productCode()).isEqualTo("DDA");
        assertThat(contextKey.productSubCode()).isEqualTo("4S");
        assertThat(contextKey.loanProductCode()).isNull();
    }
}