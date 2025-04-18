// Notice here the package name / namespace is the same as the actual CatalogService class
// This differs from .NET where the test class is usually in a separate namespace
package com.ceremony.catalog.service;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
class CatalogServiceTest {
    @Container
    static MongoDBContainer mongo = new MongoDBContainer("mongo:7");

    @DynamicPropertySource
    static void mongoProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongo::getReplicaSetUrl);
    }

    @Autowired
    CatalogService service;

    @Test
    void minOccursDropsToZeroWhenFieldMissing() {
        service.merge(List.of(
            new CatalogObservationDTO("Fulfillment", "DDA", "4S", null, null, null, null, "/Ceremony/FeeCode", "data", 1, false, false)
        ));

        service.merge(List.of(
            new CatalogObservationDTO("Fulfillment", "DDA", "4S", null, null, null, null, "/Ceremony/Other", "data", 1, false, false)
        ));

        var fee = service.find("Fulfillment", "DDA", "4S", PageRequest.of(0, 10))
                .getContent().stream()
                .filter(c -> c.getXpath().endsWith("FeeCode"))
                .findFirst().orElseThrow();

        assertThat(fee.getMinOccurs()).isZero();
    }
}
