package com.ceremony.catalog.api;

import com.ceremony.catalog.annotation.TestProfile;
import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.api.dto.ContextDefinitionDTO;
import com.ceremony.catalog.base.IntegrationTestBase;
import com.ceremony.catalog.util.TestDataBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@TestProfile(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CatalogControllerSimpleTest extends IntegrationTestBase {

    // Base class provides all setup, repositories, and restTemplate

    @Test
    void submitAndRetrieveObservations() {
        // Create context using builder
        ContextDefinitionDTO contextDef = TestDataBuilder.depositsContext();
        
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        ResponseEntity<Void> contextResponse = restTemplate.postForEntity(
            "/catalog/contexts", 
            new HttpEntity<>(contextDef, headers), 
            Void.class
        );
        assertThat(contextResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // Submit observations using builder
        var observations = List.of(
            TestDataBuilder.depositsObservation()
                .withXpath("/Ceremony/Amount")
                .build()
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
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Create contexts using builders
        restTemplate.postForEntity("/catalog/contexts", new HttpEntity<>(TestDataBuilder.depositsContext(), headers), Void.class);
        restTemplate.postForEntity("/catalog/contexts", new HttpEntity<>(TestDataBuilder.loansContext(), headers), Void.class);

        // Submit observations using builders
        var depositsObs = List.of(
            TestDataBuilder.depositsObservation()
                .withXpath("/Ceremony/Amount")
                .build()
        );

        var loansObs = List.of(
            TestDataBuilder.loansObservation()
                .withXpath("/BMIC/FICO")
                .build()
        );

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
        var observations = List.of(
            TestDataBuilder.observation()
                .withMetadata("someField", "someValue")
                .withXpath("/Test/Path")
                .build()
        );

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