package com.ceremony.catalog.service;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.api.dto.CatalogSearchCriteria;
import com.ceremony.catalog.domain.CatalogEntry;
import com.ceremony.catalog.domain.Context;
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
    private final ContextService contextService;
    
    public void merge(String contextId, List<CatalogObservationDTO> observations) {
        if (observations == null || observations.isEmpty()) return;
        
        // Validate context exists and is active
        Context context = contextService.getContext(contextId)
            .filter(Context::isActive)
            .orElseThrow(() -> new IllegalArgumentException("Context not found or inactive: " + contextId));
        
        // Validate observations against context requirements
        validateObservations(context, observations);
        
        // Collect all field IDs for batch query
        Set<String> fieldIds = observations.stream()
            .map(dto -> new FieldKey(contextId, dto.metadata(), dto.dataType(), dto.xpath()).toString())
            .collect(LinkedHashSet::new, Set::add, Set::addAll);
        
        // Single batch query to get all existing entries
        Map<String, CatalogEntry> existingEntries = repository.findAllById(fieldIds)
            .stream()
            .collect(HashMap::new, (map, entry) -> map.put(entry.getId(), entry), HashMap::putAll);
        
        // Process all observations and collect entries to save
        List<CatalogEntry> entriesToSave = new ArrayList<>();
        
        for (CatalogObservationDTO dto : observations) {
            FieldKey fieldKey = new FieldKey(contextId, dto.metadata(), dto.dataType(), dto.xpath());
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
                    .contextId(contextId)
                    .metadata(dto.metadata())
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
        handleSingleContextCleanup(contextId, observations);
    }
    
    private void validateObservations(Context context, List<CatalogObservationDTO> observations) {
        List<String> requiredFields = context.getRequiredMetadata();
        List<String> optionalFields = context.getOptionalMetadata() != null ? context.getOptionalMetadata() : List.of();
        Set<String> allowedFields = new HashSet<>(requiredFields);
        allowedFields.addAll(optionalFields);
        
        for (CatalogObservationDTO observation : observations) {
            Map<String, String> metadata = observation.metadata();
            
            // Check all required fields are present
            for (String required : requiredFields) {
                if (!metadata.containsKey(required) || metadata.get(required) == null || metadata.get(required).trim().isEmpty()) {
                    throw new IllegalArgumentException("Required metadata field missing: " + required);
                }
            }
            
            // Check no unexpected fields are present
            for (String field : metadata.keySet()) {
                if (!allowedFields.contains(field)) {
                    throw new IllegalArgumentException("Unexpected metadata field: " + field + ". Allowed fields: " + allowedFields);
                }
            }
        }
    }
    
    private void handleSingleContextCleanup(String contextId, List<CatalogObservationDTO> observations) {
        // Check if all observations are from the same context (they should be since they're submitted to a specific context)
        Set<ContextKey> contexts = observations.stream()
            .map(o -> new ContextKey(contextId, o.metadata()))
            .collect(LinkedHashSet::new, Set::add, Set::addAll);
            
        if (contexts.size() == 1) {
            ContextKey contextKey = contexts.iterator().next();
            CatalogSearchCriteria criteria = new CatalogSearchCriteria(contextId, contextKey.metadata(), null);
                
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