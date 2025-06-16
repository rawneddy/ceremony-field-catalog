package com.ceremony.catalog.api;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.api.dto.ContextDefinitionDTO;
import com.ceremony.catalog.persistence.CatalogRepository;
import com.ceremony.catalog.persistence.ContextRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;

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
    CatalogRepository catalogRepository;
    
    @Autowired
    ContextRepository contextRepository;

    @BeforeEach
    void cleanDatabase() {
        catalogRepository.deleteAll();
        contextRepository.deleteAll();
    }

    @Test
    void submitAndRetrieveObservations() {
        // First create a context
        var contextDef = new ContextDefinitionDTO(
            "deposits",
            "Deposits",
            "Test deposits context",
            List.of("productCode", "productSubCode", "action"),
            List.of(),
            true
        );
        
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        ResponseEntity<Void> contextResponse = restTemplate.postForEntity(
            "/catalog/contexts", 
            new HttpEntity<>(contextDef, headers), 
            Void.class
        );
        assertThat(contextResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // Submit observations to the context
        var observations = List.of(
            new CatalogObservationDTO(
                Map.of(
                    "productCode", "DDA",
                    "productSubCode", "4S",
                    "action", "Fulfillment"
                ),
                "/Ceremony/Amount", 
                1, 
                false, 
                false
            )
        );

        var observationRequest = new HttpEntity<>(observations, headers);
        ResponseEntity<Void> submitResponse = restTemplate.postForEntity(
            "/catalog/contexts/deposits/observations", 
            observationRequest, 
            Void.class
        );
        assertThat(submitResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // Retrieve observations
        ResponseEntity<String> getResponse = restTemplate.getForEntity(
            "/catalog/fields?contextId=deposits&page=0&size=10", 
            String.class
        );
        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getResponse.getBody()).contains("/Ceremony/Amount");
        assertThat(getResponse.getBody()).contains("deposits");
    }

    @Test
    void submitMultiplePathTypes() {
        // Create deposits context
        var depositsContext = new ContextDefinitionDTO(
            "deposits", 
            "Deposits", 
            "Deposits context",
            List.of("productCode", "productSubCode", "action"), 
            List.of(), 
            true
        );
        
        // Create loans context
        var loansContext = new ContextDefinitionDTO(
            "loans", 
            "Loans", 
            "Loans context",
            List.of("loanProductCode"), 
            List.of(), 
            true
        );

        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Create contexts
        restTemplate.postForEntity("/catalog/contexts", new HttpEntity<>(depositsContext, headers), Void.class);
        restTemplate.postForEntity("/catalog/contexts", new HttpEntity<>(loansContext, headers), Void.class);

        // Submit deposits observation
        var depositsObs = List.of(new CatalogObservationDTO(
            Map.of(
                "productCode", "DDA",
                "productSubCode", "4S", 
                "action", "Fulfillment"
            ),
            "/Ceremony/Amount", 1, false, false
        ));

        // Submit loans observation  
        var loansObs = List.of(new CatalogObservationDTO(
            Map.of("loanProductCode", "HEQF"),
            "/BMIC/FICO", 1, false, false
        ));

        var request1 = new HttpEntity<>(depositsObs, headers);
        var request2 = new HttpEntity<>(loansObs, headers);

        ResponseEntity<Void> response1 = restTemplate.postForEntity(
            "/catalog/contexts/deposits/observations", 
            request1, 
            Void.class
        );
        ResponseEntity<Void> response2 = restTemplate.postForEntity(
            "/catalog/contexts/loans/observations", 
            request2, 
            Void.class
        );

        assertThat(response1.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(response2.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // Verify both can be retrieved
        ResponseEntity<String> getAll = restTemplate.getForEntity(
            "/catalog/fields?page=0&size=10", 
            String.class
        );
        assertThat(getAll.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getAll.getBody()).contains("/Ceremony/Amount");
        assertThat(getAll.getBody()).contains("/BMIC/FICO");
    }

    @Test
    void submitToNonExistentContextFails() {
        var observations = List.of(new CatalogObservationDTO(
            Map.of("someField", "someValue"),
            "/Test/Path", 1, false, false
        ));

        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        var request = new HttpEntity<>(observations, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(
            "/catalog/contexts/nonexistent/observations", 
            request, 
            String.class
        );
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}