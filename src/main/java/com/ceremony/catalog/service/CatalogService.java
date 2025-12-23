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

    /**
     * Internal record holding cleaned observation DTO along with the original field path casing.
     * The DTO contains normalized (lowercase) fieldPath for identity, while originalFieldPath
     * preserves the casing as observed for tracking in casingCounts.
     */
    private record CleanedObservation(CatalogObservationDTO dto, String originalFieldPath) {}
    
    public void merge(String contextId, List<CatalogObservationDTO> observations) {
        if (observations == null || observations.isEmpty()) return;
        
        // Validate and clean context ID
        String cleanedContextId = validationService.validateAndCleanContextId(contextId);
        
        // Validate context exists and is active
        Context context = contextService.getContext(cleanedContextId)
            .filter(Context::isActive)
            .orElseThrow(() -> new IllegalArgumentException("Context not found or inactive: " + cleanedContextId));
        
        // Validate and clean observations against context requirements
        List<CleanedObservation> cleanedObservations = validateAndCleanObservations(observations);
        validateObservations(context, cleanedObservations.stream().map(CleanedObservation::dto).toList());
        
        // Collect all field IDs for batch query (using only required metadata for field identity)
        Set<String> fieldIds = cleanedObservations.stream()
            .map(co -> new FieldKey(cleanedContextId, filterToRequiredMetadata(context, co.dto().metadata()), co.dto().fieldPath()).toString())
            .collect(LinkedHashSet::new, Set::add, Set::addAll);
        
        // Single batch query to get all existing entries
        Map<String, CatalogEntry> existingEntries = repository.findAllById(fieldIds)
            .stream()
            .collect(HashMap::new, (map, entry) -> map.put(entry.getId(), entry), HashMap::putAll);
        
        // Use LinkedHashMap to dedupe entries by ID while preserving insertion order
        Map<String, CatalogEntry> entriesToSave = new LinkedHashMap<>();
        java.time.Instant now = java.time.Instant.now();

        for (CleanedObservation cleanedObs : cleanedObservations) {
            CatalogObservationDTO dto = cleanedObs.dto();
            String originalFieldPath = cleanedObs.originalFieldPath();

            Map<String, String> requiredMetadata = filterToRequiredMetadata(context, dto.metadata());
            Map<String, String> allowedMetadata = filterToAllowedMetadata(context, dto.metadata());
            FieldKey fieldKey = new FieldKey(cleanedContextId, requiredMetadata, dto.fieldPath());
            String id = fieldKey.toString();

            // Check both DB entries AND entries we've created in this batch
            CatalogEntry entry = existingEntries.get(id);
            if (entry != null) {
                // Update existing entry (from DB or created earlier in this batch)
                entry.setMaxOccurs(Math.max(entry.getMaxOccurs(), dto.count()));
                entry.setMinOccurs(Math.min(entry.getMinOccurs(), dto.count()));
                entry.setAllowsNull(entry.isAllowsNull() || dto.hasNull());
                entry.setAllowsEmpty(entry.isAllowsEmpty() || dto.hasEmpty());
                entry.setLastObservedAt(now);
                // Also update metadata to include any new optional metadata
                entry.setMetadata(allowedMetadata);
                // Track casing variant with count
                if (entry.getCasingCounts() == null) {
                    entry.setCasingCounts(new HashMap<>());
                }
                entry.getCasingCounts().merge(originalFieldPath, 1L, Long::sum);
                entriesToSave.put(id, entry);
            } else {
                // Create new entry - store all allowed metadata (required + optional)
                Map<String, Long> initialCasingCounts = new HashMap<>();
                initialCasingCounts.put(originalFieldPath, 1L);

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
                    .casingCounts(initialCasingCounts)
                    .build();
                // Track new entry so duplicates later in batch will merge into it
                existingEntries.put(id, newEntry);
                entriesToSave.put(id, newEntry);
            }
        }

        // Single batch save operation
        repository.saveAll(entriesToSave.values());
        
        // Handle single-context cleanup
        handleSingleContextCleanup(cleanedContextId, cleanedObservations.stream().map(CleanedObservation::dto).toList());
    }
    
    private List<CleanedObservation> validateAndCleanObservations(List<CatalogObservationDTO> observations) {
        return observations.stream()
            .map(this::validateAndCleanObservation)
            .toList();
    }

    private CleanedObservation validateAndCleanObservation(CatalogObservationDTO observation) {
        InputValidationService.CleanedFieldPath cleanedFieldPath =
            validationService.validateAndCleanFieldPathWithCasing(observation.fieldPath());
        Map<String, String> cleanedMetadata = validationService.validateAndCleanMetadata(observation.metadata());

        // Return DTO with normalized (lowercase) fieldPath for identity, plus original casing for tracking
        CatalogObservationDTO cleanedDto = new CatalogObservationDTO(
            cleanedMetadata,
            cleanedFieldPath.normalized(),
            observation.count(),
            observation.hasNull(),
            observation.hasEmpty()
        );
        return new CleanedObservation(cleanedDto, cleanedFieldPath.original());
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
            // Convert single-value metadata to multi-value for CatalogSearchCriteria
            Map<String, List<String>> multiValueMetadata = contextKey.metadata().entrySet().stream()
                .collect(HashMap::new, (m, e) -> m.put(e.getKey(), List.of(e.getValue())), HashMap::putAll);
            List<CatalogEntry> entriesToUpdate = fieldPathsToUpdate.isEmpty() ?
                List.of() :
                repository.searchByCriteria(new CatalogSearchCriteria(null, contextId, multiValueMetadata, null))
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

    /**
     * Sets the canonical casing for a field entry.
     * The canonical casing must be one of the observed casings in casingCounts,
     * or null to clear the selection.
     *
     * @param fieldId The field entry ID
     * @param canonicalCasing The canonical casing to set, or null to clear
     * @return The updated CatalogEntry
     * @throws IllegalArgumentException if field not found or casing not in casingCounts
     */
    public CatalogEntry setCanonicalCasing(String fieldId, String canonicalCasing) {
        if (fieldId == null || fieldId.trim().isEmpty()) {
            throw new IllegalArgumentException("Field ID is required");
        }

        CatalogEntry entry = repository.findById(fieldId)
            .orElseThrow(() -> new IllegalArgumentException("Field not found: " + fieldId));

        // If clearing canonical casing, just set to null
        if (canonicalCasing == null) {
            entry.setCanonicalCasing(null);
            return repository.save(entry);
        }

        // Validate that the casing exists in casingCounts
        Map<String, Long> casingCounts = entry.getCasingCounts();
        if (casingCounts == null || !casingCounts.containsKey(canonicalCasing)) {
            throw new IllegalArgumentException(
                "Canonical casing must be one of the observed casings: " +
                (casingCounts != null ? casingCounts.keySet() : "none observed")
            );
        }

        entry.setCanonicalCasing(canonicalCasing);
        return repository.save(entry);
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
        Map<String, List<String>> cleanedMetadata = criteria.metadata() != null ?
            validationService.validateAndCleanMetadataMulti(criteria.metadata()) : null;

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