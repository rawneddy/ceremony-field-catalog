package com.ceremony.catalog.util;

import com.ceremony.catalog.domain.CatalogEntry;
import com.ceremony.catalog.domain.Context;
import org.assertj.core.api.AbstractAssert;

import java.util.Map;
import java.util.Objects;

/**
 * Custom AssertJ assertions for domain objects to provide more expressive
 * and domain-specific test assertions.
 * 
 * Usage:
 * <pre>
 * import static com.ceremony.catalog.util.TestAssertions.*;
 * 
 * assertThat(catalogEntry)
 *     .hasFieldPath("/Test/Path")
 *     .hasContextId("deposits")
 *     .hasMetadata("productCode", "DDA")
 *     .hasMinOccurs(1);
 *     
 * assertThat(context)
 *     .hasId("deposits")
 *     .isActive()
 *     .hasRequiredField("productCode");
 * </pre>
 */
public class TestAssertions {
    
    /**
     * Create a CatalogEntryAssert for the given CatalogEntry
     */
    public static CatalogEntryAssert assertThat(CatalogEntry actual) {
        return new CatalogEntryAssert(actual);
    }
    
    /**
     * Create a ContextAssert for the given Context
     */
    public static ContextAssert assertThat(Context actual) {
        return new ContextAssert(actual);
    }
    
    /**
     * Custom assertions for CatalogEntry objects
     */
    public static class CatalogEntryAssert extends AbstractAssert<CatalogEntryAssert, CatalogEntry> {
        
        public CatalogEntryAssert(CatalogEntry actual) {
            super(actual, CatalogEntryAssert.class);
        }
        
        public CatalogEntryAssert hasFieldPath(String expectedFieldPath) {
            isNotNull();
            if (!Objects.equals(actual.getFieldPath(), expectedFieldPath)) {
                failWithMessage("Expected fieldPath <%s> but was <%s>", expectedFieldPath, actual.getFieldPath());
            }
            return this;
        }
        
        public CatalogEntryAssert hasContextId(String expectedContextId) {
            isNotNull();
            if (!Objects.equals(actual.getContextId(), expectedContextId)) {
                failWithMessage("Expected contextId <%s> but was <%s>", expectedContextId, actual.getContextId());
            }
            return this;
        }
        
        public CatalogEntryAssert hasMinOccurs(int expectedMinOccurs) {
            isNotNull();
            if (actual.getMinOccurs() != expectedMinOccurs) {
                failWithMessage("Expected minOccurs <%d> but was <%d>", expectedMinOccurs, actual.getMinOccurs());
            }
            return this;
        }
        
        public CatalogEntryAssert hasMaxOccurs(int expectedMaxOccurs) {
            isNotNull();
            if (actual.getMaxOccurs() != expectedMaxOccurs) {
                failWithMessage("Expected maxOccurs <%d> but was <%d>", expectedMaxOccurs, actual.getMaxOccurs());
            }
            return this;
        }
        
        public CatalogEntryAssert allowsNull() {
            isNotNull();
            if (!actual.isAllowsNull()) {
                failWithMessage("Expected entry to allow null values but it doesn't");
            }
            return this;
        }
        
        public CatalogEntryAssert doesNotAllowNull() {
            isNotNull();
            if (actual.isAllowsNull()) {
                failWithMessage("Expected entry to not allow null values but it does");
            }
            return this;
        }
        
        public CatalogEntryAssert allowsEmpty() {
            isNotNull();
            if (!actual.isAllowsEmpty()) {
                failWithMessage("Expected entry to allow empty values but it doesn't");
            }
            return this;
        }
        
        public CatalogEntryAssert doesNotAllowEmpty() {
            isNotNull();
            if (actual.isAllowsEmpty()) {
                failWithMessage("Expected entry to not allow empty values but it does");
            }
            return this;
        }
        
        public CatalogEntryAssert hasMetadata(String key, String value) {
            isNotNull();
            Map<String, String> metadata = actual.getMetadata();
            if (metadata == null) {
                failWithMessage("Expected entry to have metadata but metadata was null");
                return this;
            }
            if (!metadata.containsKey(key)) {
                failWithMessage("Expected metadata to contain key <%s> but keys were <%s>", key, metadata.keySet());
            }
            String actualValue = metadata.get(key);
            if (!Objects.equals(actualValue, value)) {
                failWithMessage("Expected metadata[%s] = <%s> but was <%s>", key, value, actualValue);
            }
            return this;
        }
        
        public CatalogEntryAssert hasMetadataKey(String key) {
            isNotNull();
            Map<String, String> metadata = actual.getMetadata();
            if (metadata == null) {
                failWithMessage("Expected entry to have metadata but metadata was null");
                return this;
            }
            if (!metadata.containsKey(key)) {
                failWithMessage("Expected metadata to contain key <%s> but keys were <%s>", key, metadata.keySet());
            }
            return this;
        }
        
        public CatalogEntryAssert doesNotHaveMetadataKey(String key) {
            isNotNull();
            Map<String, String> metadata = actual.getMetadata();
            if (metadata != null && metadata.containsKey(key)) {
                failWithMessage("Expected metadata to not contain key <%s> but it was present with value <%s>", key, metadata.get(key));
            }
            return this;
        }
        
        public CatalogEntryAssert hasId(String expectedId) {
            isNotNull();
            if (!Objects.equals(actual.getId(), expectedId)) {
                failWithMessage("Expected id <%s> but was <%s>", expectedId, actual.getId());
            }
            return this;
        }
    }
    
    /**
     * Custom assertions for Context objects
     */
    public static class ContextAssert extends AbstractAssert<ContextAssert, Context> {
        
        public ContextAssert(Context actual) {
            super(actual, ContextAssert.class);
        }
        
        public ContextAssert hasId(String expectedId) {
            isNotNull();
            if (!Objects.equals(actual.getContextId(), expectedId)) {
                failWithMessage("Expected context id <%s> but was <%s>", expectedId, actual.getContextId());
            }
            return this;
        }
        
        public ContextAssert hasDisplayName(String expectedDisplayName) {
            isNotNull();
            if (!Objects.equals(actual.getDisplayName(), expectedDisplayName)) {
                failWithMessage("Expected display name <%s> but was <%s>", expectedDisplayName, actual.getDisplayName());
            }
            return this;
        }
        
        public ContextAssert hasDescription(String expectedDescription) {
            isNotNull();
            if (!Objects.equals(actual.getDescription(), expectedDescription)) {
                failWithMessage("Expected description <%s> but was <%s>", expectedDescription, actual.getDescription());
            }
            return this;
        }
        
        public ContextAssert isActive() {
            isNotNull();
            if (!actual.isActive()) {
                failWithMessage("Expected context to be active but it was inactive");
            }
            return this;
        }
        
        public ContextAssert isInactive() {
            isNotNull();
            if (actual.isActive()) {
                failWithMessage("Expected context to be inactive but it was active");
            }
            return this;
        }
        
        public ContextAssert hasRequiredField(String fieldName) {
            isNotNull();
            if (!actual.getRequiredMetadata().contains(fieldName)) {
                failWithMessage("Expected context to have required field <%s> but required fields were <%s>", 
                    fieldName, actual.getRequiredMetadata());
            }
            return this;
        }
        
        public ContextAssert doesNotHaveRequiredField(String fieldName) {
            isNotNull();
            if (actual.getRequiredMetadata().contains(fieldName)) {
                failWithMessage("Expected context to not have required field <%s> but it was present in <%s>", 
                    fieldName, actual.getRequiredMetadata());
            }
            return this;
        }
        
        public ContextAssert hasOptionalField(String fieldName) {
            isNotNull();
            if (!actual.getOptionalMetadata().contains(fieldName)) {
                failWithMessage("Expected context to have optional field <%s> but optional fields were <%s>", 
                    fieldName, actual.getOptionalMetadata());
            }
            return this;
        }
        
        public ContextAssert hasRequiredFieldCount(int expectedCount) {
            isNotNull();
            int actualCount = actual.getRequiredMetadata().size();
            if (actualCount != expectedCount) {
                failWithMessage("Expected <%d> required fields but had <%d>: <%s>", 
                    expectedCount, actualCount, actual.getRequiredMetadata());
            }
            return this;
        }
        
        public ContextAssert hasOptionalFieldCount(int expectedCount) {
            isNotNull();
            int actualCount = actual.getOptionalMetadata().size();
            if (actualCount != expectedCount) {
                failWithMessage("Expected <%d> optional fields but had <%d>: <%s>", 
                    expectedCount, actualCount, actual.getOptionalMetadata());
            }
            return this;
        }
    }
}