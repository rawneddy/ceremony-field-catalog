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
    private final InputValidationService validationService;
    
    public void merge(String contextId, List<CatalogObservationDTO> observations) {
        if (observations == null || observations.isEmpty()) return;
        
        // Validate and clean context ID
        String cleanedContextId = validationService.validateAndCleanContextId(contextId);
        
        // Validate context exists and is active
        Context context = contextService.getContext(cleanedContextId)
            .filter(Context::isActive)
            .orElseThrow(() -> new IllegalArgumentException("Context not found or inactive: " + cleanedContextId));
        
        // Validate and clean observations against context requirements
        List<CatalogObservationDTO> cleanedObservations = validateAndCleanObservations(observations);
        validateObservations(context, cleanedObservations);
        
        // Collect all field IDs for batch query (using only required metadata for field identity)
        Set<String> fieldIds = cleanedObservations.stream()
            .map(dto -> new FieldKey(cleanedContextId, filterToRequiredMetadata(context, dto.metadata()), dto.xpath()).toString())
            .collect(LinkedHashSet::new, Set::add, Set::addAll);
        
        // Single batch query to get all existing entries
        Map<String, CatalogEntry> existingEntries = repository.findAllById(fieldIds)
            .stream()
            .collect(HashMap::new, (map, entry) -> map.put(entry.getId(), entry), HashMap::putAll);
        
        // Process all observations and collect entries to save
        List<CatalogEntry> entriesToSave = new ArrayList<>();
        
        for (CatalogObservationDTO dto : cleanedObservations) {
            Map<String, String> requiredMetadata = filterToRequiredMetadata(context, dto.metadata());
            FieldKey fieldKey = new FieldKey(cleanedContextId, requiredMetadata, dto.xpath());
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
                // Create new entry - store only required metadata for consistency
                CatalogEntry newEntry = CatalogEntry.builder()
                    .id(id)
                    .contextId(cleanedContextId)
                    .metadata(requiredMetadata)
                    .xpath(dto.xpath())
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
        handleSingleContextCleanup(cleanedContextId, cleanedObservations);
    }
    
    private List<CatalogObservationDTO> validateAndCleanObservations(List<CatalogObservationDTO> observations) {
        return observations.stream()
            .map(this::validateAndCleanObservation)
            .toList();
    }
    
    private CatalogObservationDTO validateAndCleanObservation(CatalogObservationDTO observation) {
        String cleanedXpath = validationService.validateAndCleanXPath(observation.xpath());
        Map<String, String> cleanedMetadata = validationService.validateAndCleanMetadata(observation.metadata());
        
        // Return new DTO with cleaned values
        return new CatalogObservationDTO(
            cleanedMetadata,
            cleanedXpath,
            observation.count(),
            observation.hasNull(),
            observation.hasEmpty()
        );
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
        // Get context to filter metadata
        Context context = contextService.getContext(contextId).orElse(null);
        if (context == null) return;
        
        // Check if all observations are from the same context (they should be since they're submitted to a specific context)
        Set<ContextKey> contexts = observations.stream()
            .map(o -> new ContextKey(contextId, filterToRequiredMetadata(context, o.metadata())))
            .collect(LinkedHashSet::new, Set::add, Set::addAll);
            
        if (contexts.size() == 1) {
            ContextKey contextKey = contexts.iterator().next();
            // Optimized: Get only XPath strings instead of full catalog entries
            List<String> existingXpaths = repository.findXpathsByContextAndMetadata(contextId, contextKey.metadata());
            Set<String> currentXpaths = observations.stream()
                .map(CatalogObservationDTO::xpath)
                .collect(LinkedHashSet::new, Set::add, Set::addAll);
                
            // Find XPaths that need to be updated to minOccurs=0 (present in DB but not in current observations)
            List<String> xpathsToUpdate = existingXpaths.stream()
                .filter(xpath -> !currentXpaths.contains(xpath))
                .toList();
                
            // If we have XPaths to update, fetch only those entries and update them
            List<CatalogEntry> entriesToUpdate = xpathsToUpdate.isEmpty() ? 
                List.of() : 
                repository.searchByCriteria(new CatalogSearchCriteria(contextId, contextKey.metadata(), null))
                    .stream()
                    .filter(entry -> xpathsToUpdate.contains(entry.getXpath()))
                    .peek(entry -> entry.setMinOccurs(0))
                    .toList();
                
            if (!entriesToUpdate.isEmpty()) {
                repository.saveAll(entriesToUpdate);
            }
        }
    }
    
    public Page<CatalogEntry> find(CatalogSearchCriteria criteria, Pageable pageable) {
        // Sanitize search criteria
        CatalogSearchCriteria sanitizedCriteria = sanitizeSearchCriteria(criteria);
        return repository.searchByCriteria(sanitizedCriteria, pageable);
    }
    
    private CatalogSearchCriteria sanitizeSearchCriteria(CatalogSearchCriteria criteria) {
        String cleanedContextId = criteria.contextId() != null ? 
            validationService.validateAndCleanContextId(criteria.contextId()) : null;
        String cleanedXpathContains = criteria.xpathContains() != null ?
            validationService.validateAndCleanXPath(criteria.xpathContains()) : null;
        Map<String, String> cleanedMetadata = criteria.metadata() != null ?
            validationService.validateAndCleanMetadata(criteria.metadata()) : null;
            
        return new CatalogSearchCriteria(cleanedContextId, cleanedMetadata, cleanedXpathContains);
    }
    
    private Map<String, String> filterToRequiredMetadata(Context context, Map<String, String> metadata) {
        Map<String, String> filteredMetadata = new TreeMap<>();
        for (String requiredField : context.getRequiredMetadata()) {
            String value = metadata.get(requiredField);
            if (value != null) {
                filteredMetadata.put(requiredField, value);
            }
        }
        return filteredMetadata;
    }
}