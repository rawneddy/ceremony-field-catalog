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
@SuppressWarnings("null") // Spring Data repository null safety warnings
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
            .map(dto -> new FieldKey(cleanedContextId, filterToRequiredMetadata(context, dto.metadata()), dto.fieldPath()).toString())
            .collect(LinkedHashSet::new, Set::add, Set::addAll);
        
        // Single batch query to get all existing entries
        Map<String, CatalogEntry> existingEntries = repository.findAllById(fieldIds)
            .stream()
            .collect(HashMap::new, (map, entry) -> map.put(entry.getId(), entry), HashMap::putAll);
        
        List<CatalogEntry> entriesToSave = new ArrayList<>();
        java.time.Instant now = java.time.Instant.now();
        
        for (CatalogObservationDTO dto : cleanedObservations) {
            Map<String, String> requiredMetadata = filterToRequiredMetadata(context, dto.metadata());
            Map<String, String> allowedMetadata = filterToAllowedMetadata(context, dto.metadata());
            FieldKey fieldKey = new FieldKey(cleanedContextId, requiredMetadata, dto.fieldPath());
            String id = fieldKey.toString();
            
            CatalogEntry entry = existingEntries.get(id);
            if (entry != null) {
                // Update existing entry
                entry.setMaxOccurs(Math.max(entry.getMaxOccurs(), dto.count()));
                entry.setMinOccurs(Math.min(entry.getMinOccurs(), dto.count()));
                entry.setAllowsNull(entry.isAllowsNull() || dto.hasNull());
                entry.setAllowsEmpty(entry.isAllowsEmpty() || dto.hasEmpty());
                entry.setLastObservedAt(now);
                // Also update metadata to include any new optional metadata
                entry.setMetadata(allowedMetadata);
                entriesToSave.add(entry);
            } else {
                // Create new entry - store all allowed metadata (required + optional)
                CatalogEntry newEntry = CatalogEntry.builder()
                    .id(id)
                    .contextId(cleanedContextId)
                    .metadata(allowedMetadata)
                    .fieldPath(dto.fieldPath())
                    .maxOccurs(dto.count())
                    .minOccurs(dto.count())
                    .allowsNull(dto.hasNull())
                    .allowsEmpty(dto.hasEmpty())
                    .firstObservedAt(now)
                    .lastObservedAt(now)
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
        String cleanedFieldPath = validationService.validateAndCleanFieldPath(observation.fieldPath());
        Map<String, String> cleanedMetadata = validationService.validateAndCleanMetadata(observation.metadata());
        
        // Return new DTO with cleaned values
        return new CatalogObservationDTO(
            cleanedMetadata,
            cleanedFieldPath,
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
        
        // Create case-insensitive lookup sets
        Set<String> allowedFieldsLower = allowedFields.stream()
            .map(String::toLowerCase)
            .collect(HashSet::new, Set::add, Set::addAll);
        Set<String> requiredFieldsLower = requiredFields.stream()
            .map(String::toLowerCase)
            .collect(HashSet::new, Set::add, Set::addAll);
        
        for (CatalogObservationDTO observation : observations) {
            Map<String, String> metadata = observation.metadata();
            
            // Create case-insensitive lookup map
            Map<String, String> metadataLower = metadata.entrySet().stream()
                .collect(HashMap::new, 
                    (map, entry) -> map.put(entry.getKey().toLowerCase(), entry.getValue()),
                    HashMap::putAll);
            
            // Check all required fields are present (case-insensitive)
            for (String required : requiredFieldsLower) {
                if (!metadataLower.containsKey(required) || metadataLower.get(required) == null || metadataLower.get(required).trim().isEmpty()) {
                    throw new IllegalArgumentException("Required metadata field missing: " + required);
                }
            }
            
            // Check no unexpected fields are present (case-insensitive)
            for (String field : metadataLower.keySet()) {
                if (!allowedFieldsLower.contains(field)) {
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
            // Optimized: Get only field path strings instead of full catalog entries
            List<String> existingFieldPaths = repository.findFieldPathsByContextAndMetadata(contextId, contextKey.metadata());
            Set<String> currentFieldPaths = observations.stream()
                .map(CatalogObservationDTO::fieldPath)
                .collect(LinkedHashSet::new, Set::add, Set::addAll);
                
            // Find field paths that need to be updated to minOccurs=0 (present in DB but not in current observations)
            List<String> fieldPathsToUpdate = existingFieldPaths.stream()
                .filter(fieldPath -> !currentFieldPaths.contains(fieldPath))
                .toList();
                
            // If we have field paths to update, fetch only those entries and update them
            List<CatalogEntry> entriesToUpdate = fieldPathsToUpdate.isEmpty() ? 
                List.of() : 
                repository.searchByCriteria(new CatalogSearchCriteria(null, contextId, contextKey.metadata(), null))
                    .stream()
                    .filter(entry -> fieldPathsToUpdate.contains(entry.getFieldPath()))
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
        // Get active context IDs to filter results - inactive contexts are invisible to searches
        Set<String> activeContextIds = contextService.getActiveContextIds();
        return repository.searchByCriteria(sanitizedCriteria, activeContextIds, pageable);
    }

    public List<String> suggestValues(String field, String prefix, String contextId, Map<String, String> metadata, int limit) {
        // Validate field parameter
        if (field == null || field.trim().isEmpty()) {
            throw new IllegalArgumentException("Field parameter is required");
        }

        // Normalize to lowercase - all MongoDB field names are lowercase
        String normalizedField = field.toLowerCase();

        if (!normalizedField.equals("fieldpath") && !normalizedField.startsWith("metadata.") && !normalizedField.equals("discovery")) {
            throw new IllegalArgumentException("Field must be 'fieldPath', 'metadata.{name}', or 'discovery'");
        }

        // Sanitize inputs - InputValidationService handles lowercasing
        String cleanedContextId = contextId != null ?
            validationService.validateAndCleanContextId(contextId) : null;
        Map<String, String> cleanedMetadata = metadata != null ?
            validationService.validateAndCleanMetadata(metadata) : null;

        // Lowercase prefix for case-insensitive matching
        String cleanedPrefix = prefix != null ? prefix.toLowerCase() : null;

        // Ensure limit is reasonable
        int safeLimit = Math.max(1, Math.min(limit, 100));

        // Get active context IDs - suggestions only come from active contexts
        Set<String> activeContextIds = contextService.getActiveContextIds();

        if ("discovery".equals(normalizedField)) {
            return repository.discoverySuggest(cleanedPrefix, cleanedContextId, cleanedMetadata, activeContextIds, safeLimit);
        }

        return repository.suggestValues(normalizedField, cleanedPrefix, cleanedContextId, cleanedMetadata, activeContextIds, safeLimit);
    }

    public long countFieldsByContextId(String contextId) {
        if (contextId == null || contextId.trim().isEmpty()) {
            return 0;
        }
        String cleanedContextId = validationService.validateAndCleanContextId(contextId);
        return repository.countByContextId(cleanedContextId);
    }
    
    private CatalogSearchCriteria sanitizeSearchCriteria(CatalogSearchCriteria criteria) {
        // Sanitize global search term (q) - only lowercase, don't escape regex chars
        // The repository will handle escaping based on useRegex flag
        String cleanedQ = criteria.q() != null ?
            criteria.q().toLowerCase() : null;

        String cleanedContextId = criteria.contextId() != null ?
            validationService.validateAndCleanContextId(criteria.contextId()) : null;
        // Don't escape fieldPathContains - repository handles it based on useRegex
        String cleanedFieldPathContains = criteria.fieldPathContains() != null ?
            criteria.fieldPathContains().toLowerCase() : null;
        Map<String, String> cleanedMetadata = criteria.metadata() != null ?
            validationService.validateAndCleanMetadata(criteria.metadata()) : null;

        return new CatalogSearchCriteria(cleanedQ, cleanedContextId, cleanedMetadata, cleanedFieldPathContains, criteria.useRegex());
    }
    
    private Map<String, String> filterToRequiredMetadata(Context context, Map<String, String> metadata) {
        // Metadata is already lowercase from InputValidationService
        Map<String, String> filteredMetadata = new TreeMap<>();
        for (String requiredField : context.getRequiredMetadata()) {
            String value = metadata.get(requiredField);
            if (value != null) {
                filteredMetadata.put(requiredField, value);
            }
        }
        return filteredMetadata;
    }

    private Map<String, String> filterToAllowedMetadata(Context context, Map<String, String> metadata) {
        // Metadata is already lowercase from InputValidationService
        Map<String, String> filteredMetadata = new TreeMap<>();

        // Include required metadata
        for (String requiredField : context.getRequiredMetadata()) {
            String value = metadata.get(requiredField);
            if (value != null) {
                filteredMetadata.put(requiredField, value);
            }
        }

        // Include optional metadata if present
        if (context.getOptionalMetadata() != null) {
            for (String optionalField : context.getOptionalMetadata()) {
                String value = metadata.get(optionalField);
                if (value != null) {
                    filteredMetadata.put(optionalField, value);
                }
            }
        }

        return filteredMetadata;
    }
}