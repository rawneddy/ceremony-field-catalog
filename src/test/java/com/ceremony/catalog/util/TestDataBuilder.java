package com.ceremony.catalog.util;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.api.dto.ContextDefinitionDTO;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Fluent test data builders for creating consistent test objects across all test types.
 * Provides builder pattern with sensible defaults and easy customization.
 * 
 * Usage:
 * <pre>
 * ContextDefinitionDTO context = TestDataBuilder.context()
 *     .withId("deposits")
 *     .withRequiredFields("productCode", "action")
 *     .build();
 *     
 * CatalogObservationDTO observation = TestDataBuilder.observation()
 *     .withMetadata("productCode", "DDA")
 *     .withXpath("/Test/Path")
 *     .allowsNull()
 *     .build();
 * </pre>
 */
public class TestDataBuilder {
    
    /**
     * Builder for ContextDefinitionDTO objects
     */
    public static class ContextBuilder {
        private String id = "test-context";
        private String displayName = "Test Context";
        private String description = "Test context description";
        private List<String> requiredMetadataFields = List.of("field1", "field2");
        private List<String> optionalMetadataFields = List.of();
        private boolean active = true;
        
        public ContextBuilder withId(String id) {
            this.id = id;
            this.displayName = id.toUpperCase();
            this.description = "Test " + id + " context";
            return this;
        }
        
        public ContextBuilder withDisplayName(String displayName) {
            this.displayName = displayName;
            return this;
        }
        
        public ContextBuilder withDescription(String description) {
            this.description = description;
            return this;
        }
        
        public ContextBuilder withRequiredFields(String... fields) {
            this.requiredMetadataFields = List.of(fields);
            return this;
        }
        
        public ContextBuilder withRequiredFields(List<String> fields) {
            this.requiredMetadataFields = List.copyOf(fields);
            return this;
        }
        
        public ContextBuilder withOptionalFields(String... fields) {
            this.optionalMetadataFields = List.of(fields);
            return this;
        }
        
        public ContextBuilder withOptionalFields(List<String> fields) {
            this.optionalMetadataFields = List.copyOf(fields);
            return this;
        }
        
        public ContextBuilder inactive() {
            this.active = false;
            return this;
        }
        
        public ContextBuilder active() {
            this.active = true;
            return this;
        }
        
        public ContextDefinitionDTO build() {
            return new ContextDefinitionDTO(
                id, 
                displayName, 
                description, 
                requiredMetadataFields, 
                optionalMetadataFields, 
                active
            );
        }
    }
    
    /**
     * Builder for CatalogObservationDTO objects
     */
    public static class ObservationBuilder {
        private Map<String, String> metadata = new HashMap<>(Map.of("field1", "value1"));
        private String xpath = "/Test/Path";
        private int occurs = 1;
        private boolean allowsNull = false;
        private boolean allowsEmpty = false;
        
        public ObservationBuilder withMetadata(String key, String value) {
            this.metadata.put(key, value);
            return this;
        }
        
        public ObservationBuilder withMetadata(Map<String, String> metadata) {
            this.metadata.clear();
            this.metadata.putAll(metadata);
            return this;
        }
        
        public ObservationBuilder clearMetadata() {
            this.metadata.clear();
            return this;
        }
        
        public ObservationBuilder withXpath(String xpath) {
            this.xpath = xpath;
            return this;
        }
        
        public ObservationBuilder withOccurs(int occurs) {
            this.occurs = occurs;
            return this;
        }
        
        public ObservationBuilder allowsNull() {
            this.allowsNull = true;
            return this;
        }
        
        public ObservationBuilder allowsNull(boolean allowsNull) {
            this.allowsNull = allowsNull;
            return this;
        }
        
        public ObservationBuilder allowsEmpty() {
            this.allowsEmpty = true;
            return this;
        }
        
        public ObservationBuilder allowsEmpty(boolean allowsEmpty) {
            this.allowsEmpty = allowsEmpty;
            return this;
        }
        
        public CatalogObservationDTO build() {
            return new CatalogObservationDTO(
                Map.copyOf(metadata), 
                xpath, 
                occurs, 
                allowsNull, 
                allowsEmpty
            );
        }
    }
    
    /**
     * Specialized builder for Deposits context observations
     */
    public static class DepositsObservationBuilder extends ObservationBuilder {
        public DepositsObservationBuilder() {
            withMetadata(Map.of(
                "productCode", "DDA",
                "productSubCode", "4S", 
                "action", "Fulfillment"
            ));
        }
        
        public DepositsObservationBuilder withProductCode(String productCode) {
            return (DepositsObservationBuilder) withMetadata("productCode", productCode);
        }
        
        public DepositsObservationBuilder withProductSubCode(String productSubCode) {
            return (DepositsObservationBuilder) withMetadata("productSubCode", productSubCode);
        }
        
        public DepositsObservationBuilder withAction(String action) {
            return (DepositsObservationBuilder) withMetadata("action", action);
        }
    }
    
    /**
     * Specialized builder for Loans context observations
     */
    public static class LoansObservationBuilder extends ObservationBuilder {
        public LoansObservationBuilder() {
            clearMetadata();
            withMetadata("loanProductCode", "HEQF");
        }
        
        public LoansObservationBuilder withLoanProductCode(String loanProductCode) {
            return (LoansObservationBuilder) withMetadata("loanProductCode", loanProductCode);
        }
    }
    
    /**
     * Specialized builder for OnDemand context observations  
     */
    public static class OnDemandObservationBuilder extends ObservationBuilder {
        public OnDemandObservationBuilder() {
            withMetadata(Map.of(
                "formCode", "ACK123",
                "formVersion", "1.0"
            ));
        }
        
        public OnDemandObservationBuilder withFormCode(String formCode) {
            return (OnDemandObservationBuilder) withMetadata("formCode", formCode);
        }
        
        public OnDemandObservationBuilder withFormVersion(String formVersion) {
            return (OnDemandObservationBuilder) withMetadata("formVersion", formVersion);
        }
    }
    
    // Static factory methods for fluent API
    
    public static ContextBuilder context() {
        return new ContextBuilder();
    }
    
    public static ObservationBuilder observation() {
        return new ObservationBuilder();
    }
    
    public static DepositsObservationBuilder depositsObservation() {
        return new DepositsObservationBuilder();
    }
    
    public static LoansObservationBuilder loansObservation() {
        return new LoansObservationBuilder();
    }
    
    public static OnDemandObservationBuilder onDemandObservation() {
        return new OnDemandObservationBuilder();
    }
    
    // Common pre-built contexts for convenience
    
    public static ContextDefinitionDTO depositsContext() {
        return context()
            .withId("deposits")
            .withRequiredFields("productCode", "productSubCode", "action")
            .build();
    }
    
    public static ContextDefinitionDTO loansContext() {
        return context()
            .withId("loans")
            .withRequiredFields("loanProductCode")
            .build();
    }
    
    public static ContextDefinitionDTO onDemandContext() {
        return context()
            .withId("ondemand")
            .withRequiredFields("formCode", "formVersion")
            .build();
    }
}