package com.ceremony.catalog.api;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.persistence.CatalogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class CatalogControllerSimpleTest {

    @Container
    static MongoDBContainer mongo = new MongoDBContainer("mongo:7");

    @DynamicPropertySource
    static void mongoProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongo::getReplicaSetUrl);
    }

    @Autowired
    TestRestTemplate restTemplate;

    @Autowired
    CatalogRepository repository;

    @BeforeEach
    void cleanDatabase() {
        repository.deleteAll();
    }

    @Test
    void submitAndRetrieveObservations() {
        // Submit observations
        var observations = List.of(
            new CatalogObservationDTO(
                "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null,
                "/Ceremony/Amount", "data", 1, false, false
            )
        );

        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        var request = new HttpEntity<>(observations, headers);
        
        ResponseEntity<Void> postResponse = restTemplate.postForEntity(
            "/catalog/observed-fields", request, Void.class);
        
        assertThat(postResponse.getStatusCode().value()).isEqualTo(204);

        // Retrieve observations
        ResponseEntity<String> getResponse = restTemplate.getForEntity(
            "/catalog/fields?pathType=deposits&productCode=DDA", String.class);
        
        assertThat(getResponse.getStatusCode().value()).isEqualTo(200);
        assertThat(getResponse.getBody()).contains("/Ceremony/Amount");
        assertThat(getResponse.getBody()).contains("\"totalElements\":1");
    }

    @Test
    void searchWithXpathFilter() {
        // Submit multiple observations
        var observations = List.of(
            new CatalogObservationDTO(
                "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null,
                "/Ceremony/FeeCode", "data", 1, false, false
            ),
            new CatalogObservationDTO(
                "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null,
                "/Ceremony/Amount", "data", 1, false, false
            )
        );

        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        var request = new HttpEntity<>(observations, headers);
        
        restTemplate.postForEntity("/catalog/observed-fields", request, Void.class);

        // Search with xpath filter
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/catalog/fields?xpathContains=Fee", String.class);
        
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("FeeCode");
        assertThat(response.getBody()).doesNotContain("Amount");
    }

    @Test
    void handlesDifferentPathTypes() {
        // Test loans path type
        var loansObservation = List.of(
            new CatalogObservationDTO(
                "loans", null, null, null, null, null, "HEQF",
                "/BMIC/Application/FICO", "data", 1, false, false
            )
        );

        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        var request = new HttpEntity<>(loansObservation, headers);
        
        ResponseEntity<Void> postResponse = restTemplate.postForEntity(
            "/catalog/observed-fields", request, Void.class);
        
        assertThat(postResponse.getStatusCode().value()).isEqualTo(204);

        // Verify loans data
        ResponseEntity<String> getResponse = restTemplate.getForEntity(
            "/catalog/fields?pathType=loans&loanProductCode=HEQF", String.class);
        
        assertThat(getResponse.getStatusCode().value()).isEqualTo(200);
        assertThat(getResponse.getBody()).contains("FICO");
    }

    @Test
    void paginationWorks() {
        // Create multiple observations
        for (int i = 0; i < 25; i++) {
            var observations = List.of(
                new CatalogObservationDTO(
                    "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null,
                    "/Ceremony/Field" + i, "data", 1, false, false
                )
            );

            var headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            var request = new HttpEntity<>(observations, headers);
            
            restTemplate.postForEntity("/catalog/observed-fields", request, Void.class);
        }

        // Test pagination
        ResponseEntity<String> page1 = restTemplate.getForEntity(
            "/catalog/fields?pathType=deposits&page=0&size=10", String.class);
        
        ResponseEntity<String> page2 = restTemplate.getForEntity(
            "/catalog/fields?pathType=deposits&page=1&size=10", String.class);
        
        assertThat(page1.getStatusCode().value()).isEqualTo(200);
        assertThat(page2.getStatusCode().value()).isEqualTo(200);
        assertThat(page1.getBody()).contains("\"totalElements\":25");
        assertThat(page2.getBody()).contains("\"totalElements\":25");
    }
}