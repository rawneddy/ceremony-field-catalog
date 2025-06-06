package com.ceremony.catalog.service;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.api.dto.CatalogSearchCriteria;
import com.ceremony.catalog.persistence.CatalogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
    
    @Autowired
    CatalogRepository repository;
    
    @BeforeEach
    void cleanDatabase() {
        repository.deleteAll();
    }

    @Test
    void minOccursDropsToZeroWhenFieldMissing() {
        service.merge(List.of(
            new CatalogObservationDTO("deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, "/Ceremony/FeeCode", "data", 1, false, false)
        ));

        service.merge(List.of(
            new CatalogObservationDTO("deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, "/Ceremony/Other", "data", 1, false, false)
        ));

        CatalogSearchCriteria criteria = new CatalogSearchCriteria(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, null
        );
        var fee = service.find(criteria, PageRequest.of(0, 10))
                .getContent().stream()
                .filter(c -> c.getXpath().endsWith("FeeCode"))
                .findFirst().orElseThrow();

        assertThat(fee.getMinOccurs()).isZero();
    }
    
    @Test
    void mergeCreatesNewEntryWhenNotExists() {
        var observation = new CatalogObservationDTO(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, 
            "/Ceremony/Amount", "data", 5, true, false
        );
        
        service.merge(List.of(observation));
        
        var criteria = new CatalogSearchCriteria(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, null
        );
        var results = service.find(criteria, PageRequest.of(0, 10));
        
        assertThat(results.getContent()).hasSize(1);
        var entry = results.getContent().get(0);
        assertThat(entry.getXpath()).isEqualTo("/Ceremony/Amount");
        assertThat(entry.getDataType()).isEqualTo("data");
        assertThat(entry.getMinOccurs()).isEqualTo(5);
        assertThat(entry.getMaxOccurs()).isEqualTo(5);
        assertThat(entry.isAllowsNull()).isTrue();
        assertThat(entry.isAllowsEmpty()).isFalse();
    }
    
    @Test
    void mergeUpdatesExistingEntry() {
        // First observation
        service.merge(List.of(
            new CatalogObservationDTO("deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, 
                "/Ceremony/Amount", "data", 3, false, false)
        ));
        
        // Second observation with different values
        service.merge(List.of(
            new CatalogObservationDTO("deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, 
                "/Ceremony/Amount", "data", 7, true, true)
        ));
        
        var criteria = new CatalogSearchCriteria(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, null
        );
        var results = service.find(criteria, PageRequest.of(0, 10));
        
        assertThat(results.getContent()).hasSize(1);
        var entry = results.getContent().get(0);
        assertThat(entry.getMinOccurs()).isEqualTo(3); // Should be min of 3 and 7
        assertThat(entry.getMaxOccurs()).isEqualTo(7); // Should be max of 3 and 7
        assertThat(entry.isAllowsNull()).isTrue(); // Should be OR of false and true
        assertThat(entry.isAllowsEmpty()).isTrue(); // Should be OR of false and true
    }
    
    @Test
    void mergeBatchProcessingIsEfficient() {
        // Create multiple observations to test batch processing
        var observations = List.of(
            new CatalogObservationDTO("deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, 
                "/Ceremony/Amount1", "data", 1, false, false),
            new CatalogObservationDTO("deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, 
                "/Ceremony/Amount2", "data", 2, false, false),
            new CatalogObservationDTO("deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, 
                "/Ceremony/Amount3", "data", 3, false, false)
        );
        
        service.merge(observations);
        
        var criteria = new CatalogSearchCriteria(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, null
        );
        var results = service.find(criteria, PageRequest.of(0, 10));
        
        assertThat(results.getContent()).hasSize(3);
        assertThat(results.getContent())
            .extracting("xpath")
            .containsExactlyInAnyOrder("/Ceremony/Amount1", "/Ceremony/Amount2", "/Ceremony/Amount3");
    }
    
    @Test
    void mergeHandlesLoansPathType() {
        var observation = new CatalogObservationDTO(
            "loans", null, null, null, null, null, "HEQF", 
            "/BMIC/Application/FICO", "data", 1, false, false
        );
        
        service.merge(List.of(observation));
        
        var criteria = new CatalogSearchCriteria(
            "loans", null, null, null, null, null, "HEQF", null
        );
        var results = service.find(criteria, PageRequest.of(0, 10));
        
        assertThat(results.getContent()).hasSize(1);
        var entry = results.getContent().get(0);
        assertThat(entry.getPathType()).isEqualTo("loans");
        assertThat(entry.getLoanProductCode()).isEqualTo("HEQF");
        assertThat(entry.getXpath()).isEqualTo("/BMIC/Application/FICO");
    }
    
    @Test
    void mergeHandlesOnDemandPathType() {
        var observation = new CatalogObservationDTO(
            "ondemand", "ACK123", "v1.0", null, null, null, null, 
            "/eDocument/PrimaryCustomer/Name/First", "data", 1, false, false
        );
        
        service.merge(List.of(observation));
        
        var criteria = new CatalogSearchCriteria(
            "ondemand", "ACK123", "v1.0", null, null, null, null, null
        );
        var results = service.find(criteria, PageRequest.of(0, 10));
        
        assertThat(results.getContent()).hasSize(1);
        var entry = results.getContent().get(0);
        assertThat(entry.getPathType()).isEqualTo("ondemand");
        assertThat(entry.getFormCode()).isEqualTo("ACK123");
        assertThat(entry.getFormVersion()).isEqualTo("v1.0");
    }
    
    @Test
    void mergeHandlesEmptyList() {
        service.merge(List.of());
        
        var criteria = new CatalogSearchCriteria(
            null, null, null, null, null, null, null, null
        );
        var results = service.find(criteria, PageRequest.of(0, 10));
        
        assertThat(results.getContent()).isEmpty();
    }
    
    @Test
    void mergeHandlesNullList() {
        service.merge(null);
        
        var criteria = new CatalogSearchCriteria(
            null, null, null, null, null, null, null, null
        );
        var results = service.find(criteria, PageRequest.of(0, 10));
        
        assertThat(results.getContent()).isEmpty();
    }
    
    @Test
    void findSupportsXpathContainsFilter() {
        service.merge(List.of(
            new CatalogObservationDTO("deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, 
                "/Ceremony/FeeCode", "data", 1, false, false),
            new CatalogObservationDTO("deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, 
                "/Ceremony/Amount", "data", 1, false, false)
        ));
        
        var criteria = new CatalogSearchCriteria(
            null, null, null, null, null, null, null, "Fee"
        );
        var results = service.find(criteria, PageRequest.of(0, 10));
        
        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).getXpath()).contains("Fee");
    }
    
    @Test
    void findSupportsPagination() {
        // Create multiple entries
        for (int i = 0; i < 15; i++) {
            service.merge(List.of(
                new CatalogObservationDTO("deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, 
                    "/Ceremony/Field" + i, "data", 1, false, false)
            ));
        }
        
        var criteria = new CatalogSearchCriteria(
            "deposits", "DDA", "4S", "Fulfillment", "DDA", "4S", null, null
        );
        
        // First page
        Page<com.ceremony.catalog.domain.CatalogEntry> page1 = service.find(criteria, PageRequest.of(0, 5));
        assertThat(page1.getContent()).hasSize(5);
        assertThat(page1.getTotalElements()).isEqualTo(15);
        assertThat(page1.getTotalPages()).isEqualTo(3);
        
        // Second page
        Page<com.ceremony.catalog.domain.CatalogEntry> page2 = service.find(criteria, PageRequest.of(1, 5));
        assertThat(page2.getContent()).hasSize(5);
        assertThat(page2.getTotalElements()).isEqualTo(15);
        
        // Third page
        Page<com.ceremony.catalog.domain.CatalogEntry> page3 = service.find(criteria, PageRequest.of(2, 5));
        assertThat(page3.getContent()).hasSize(5);
        assertThat(page3.getTotalElements()).isEqualTo(15);
    }
}
