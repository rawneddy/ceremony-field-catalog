package com.ceremony.catalog.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mongodb.MongoDBContainer;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests that verify YAML configuration properties are correctly bound
 * to CatalogProperties. These tests catch config binding mismatches
 * (e.g., YAML uses different property names than Java expects).
 */
@SpringBootTest
@Testcontainers
@TestPropertySource(properties = {
    "app.catalog.validation.max-field-path-length=999",
    "app.catalog.validation.max-context-id-length=88",
    "app.catalog.validation.max-metadata-key-length=77",
    "app.catalog.validation.max-metadata-value-length=666"
})
class CatalogPropertiesBindingTest {

    @SuppressWarnings("resource")
    @Container
    static MongoDBContainer mongoContainer = new MongoDBContainer("mongo:7")
            .withReuse(true);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongoContainer::getReplicaSetUrl);
    }

    @Autowired
    private CatalogProperties properties;

    @Test
    void validationPropertiesAreCorrectlyBound() {
        // These assertions verify that Spring correctly binds kebab-case YAML
        // properties to camelCase Java fields. If binding fails, values would
        // be the defaults from CatalogProperties, not our test values.

        CatalogProperties.Validation validation = properties.getValidation();

        assertThat(validation.getMaxFieldPathLength())
            .as("max-field-path-length should bind to maxFieldPathLength")
            .isEqualTo(999);

        assertThat(validation.getMaxContextIdLength())
            .as("max-context-id-length should bind to maxContextIdLength")
            .isEqualTo(88);

        assertThat(validation.getMaxMetadataKeyLength())
            .as("max-metadata-key-length should bind to maxMetadataKeyLength")
            .isEqualTo(77);

        assertThat(validation.getMaxMetadataValueLength())
            .as("max-metadata-value-length should bind to maxMetadataValueLength")
            .isEqualTo(666);
    }

    @Test
    void searchPropertiesAreCorrectlyBound() {
        // Verify search properties bind correctly (using defaults since not overridden)
        CatalogProperties.Search search = properties.getSearch();

        assertThat(search.getDefaultPageSize())
            .as("default-page-size should bind")
            .isGreaterThan(0);

        assertThat(search.getMaxPageSize())
            .as("max-page-size should bind")
            .isGreaterThan(0);
    }

    @Test
    void batchPropertiesAreCorrectlyBound() {
        CatalogProperties.Batch batch = properties.getBatch();

        assertThat(batch.getMaxSize())
            .as("batch max-size should bind")
            .isGreaterThan(0);

        assertThat(batch.getTimeout())
            .as("batch timeout should bind")
            .isNotNull();
    }
}
