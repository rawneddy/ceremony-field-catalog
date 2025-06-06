package com.ceremony.catalog.service;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.api.dto.CatalogSearchCriteria;
import com.ceremony.catalog.domain.CatalogEntry;
import com.ceremony.catalog.domain.ContextKey;
import com.ceremony.catalog.domain.FieldKey;
import com.ceremony.catalog.persistence.CatalogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class CatalogService {
    private final CatalogRepository repository;
    public void merge(List<CatalogObservationDTO> observations) {
        if (observations == null || observations.isEmpty()) return;
        
        // Collect all field IDs for batch query
        Set<String> fieldIds = observations.stream()
            .map(dto -> new FieldKey(
                dto.pathType(), dto.formCode(), dto.formVersion(),
                dto.action(), dto.productCode(), dto.productSubCode(), dto.loanProductCode(),
                dto.dataType(), dto.xpath()).toString())
            .collect(LinkedHashSet::new, Set::add, Set::addAll);
        
        // Single batch query to get all existing entries
        Map<String, CatalogEntry> existingEntries = repository.findAllById(fieldIds)
            .stream()
            .collect(HashMap::new, (map, entry) -> map.put(entry.getId(), entry), HashMap::putAll);
        
        // Process all observations and collect entries to save
        List<CatalogEntry> entriesToSave = new ArrayList<>();
        
        for (CatalogObservationDTO dto : observations) {
            FieldKey fieldKey = new FieldKey(
                dto.pathType(), dto.formCode(), dto.formVersion(),
                dto.action(), dto.productCode(), dto.productSubCode(), dto.loanProductCode(),
                dto.dataType(), dto.xpath()
            );
            String id = fieldKey.toString();
            
            CatalogEntry entry = existingEntries.get(id);
            if (entry != null) {
                // Update existing entry
                entry.setMaxOccurs(Math.max(entry.getMaxOccurs(), dto.count()));
                entry.setMinOccurs(Math.min(entry.getMinOccurs(), dto.count()));
                entry.setAllowsNull(entry.isAllowsNull() || dto.hasNull());
                entry.setAllowsEmpty(entry.isAllowsEmpty() || dto.hasEmpty());
                entriesToSave.add(entry);
            } else {
                // Create new entry
                CatalogEntry newEntry = CatalogEntry.builder()
                    .id(id)
                    .pathType(dto.pathType())
                    .formCode(dto.formCode())
                    .formVersion(dto.formVersion())
                    .action(dto.action())
                    .productCode(dto.productCode())
                    .productSubCode(dto.productSubCode())
                    .loanProductCode(dto.loanProductCode())
                    .xpath(dto.xpath())
                    .dataType(dto.dataType())
                    .maxOccurs(dto.count())
                    .minOccurs(dto.count())
                    .allowsNull(dto.hasNull())
                    .allowsEmpty(dto.hasEmpty())
                    .build();
                entriesToSave.add(newEntry);
            }
        }
        
        // Single batch save operation
        repository.saveAll(entriesToSave);
        
        // Handle single-context cleanup
        handleSingleContextCleanup(observations);
    }
    
    private void handleSingleContextCleanup(List<CatalogObservationDTO> observations) {
        // Check if all observations are from the same context
        Set<ContextKey> contexts = observations.stream()
            .map(o -> new ContextKey(
                o.pathType(), o.formCode(), o.formVersion(),
                o.action(), o.productCode(), o.productSubCode(), o.loanProductCode()))
            .collect(LinkedHashSet::new, Set::add, Set::addAll);
            
        if (contexts.size() == 1) {
            ContextKey context = contexts.iterator().next();
            CatalogSearchCriteria criteria = new CatalogSearchCriteria(
                context.pathType(), context.formCode(), context.formVersion(),
                context.action(), context.productCode(), context.productSubCode(), 
                context.loanProductCode(), null);
                
            List<CatalogEntry> existingEntries = repository.searchByCriteria(criteria);
            Set<String> currentXpaths = observations.stream()
                .map(CatalogObservationDTO::xpath)
                .collect(LinkedHashSet::new, Set::add, Set::addAll);
                
            List<CatalogEntry> entriesToUpdate = existingEntries.stream()
                .filter(entry -> !currentXpaths.contains(entry.getXpath()))
                .peek(entry -> entry.setMinOccurs(0))
                .toList();
                
            if (!entriesToUpdate.isEmpty()) {
                repository.saveAll(entriesToUpdate);
            }
        }
    }
    public Page<CatalogEntry> find(CatalogSearchCriteria criteria, Pageable pageable) {
        return repository.searchByCriteria(criteria, pageable);
    }
}
