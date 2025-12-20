package com.ceremony.catalog.service;

import com.ceremony.catalog.api.dto.ContextDefinitionDTO;
import com.ceremony.catalog.api.dto.ContextWithCountDTO;
import com.ceremony.catalog.domain.Context;
import com.ceremony.catalog.persistence.CatalogRepository;
import com.ceremony.catalog.persistence.ContextRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null") // Spring Data repository null safety warnings
public class ContextService {
    private final ContextRepository repository;
    private final CatalogRepository catalogRepository;
    private final InputValidationService validationService;

    public Context createContext(ContextDefinitionDTO dto) {
        // Validate and lowercase contextId
        String cleanedContextId = validationService.validateAndCleanContextId(dto.getContextId());

        // Normalize metadata field names to lowercase for case-insensitive handling
        List<String> normalizedRequired = dto.getRequiredMetadata() != null ?
            dto.getRequiredMetadata().stream().map(String::toLowerCase).toList() : null;
        List<String> normalizedOptional = dto.getOptionalMetadata() != null ?
            dto.getOptionalMetadata().stream().map(String::toLowerCase).toList() : null;

        // Validate metadata rules
        validateMetadataRules(dto.getMetadataRules(), normalizedRequired, normalizedOptional);

        Context context = Context.builder()
            .contextId(cleanedContextId)
            .displayName(dto.getDisplayName())
            .description(dto.getDescription())
            .requiredMetadata(normalizedRequired)
            .optionalMetadata(normalizedOptional)
            .metadataRules(dto.getMetadataRules())
            .active(dto.getActive())
            .createdAt(Instant.now())
            .build();

        return repository.save(context);
    }
    
    public Optional<Context> updateContext(String contextId, ContextDefinitionDTO dto) {
        return repository.findById(contextId)
            .map(existing -> {
                // Validate that required metadata hasn't changed
                validateRequiredMetadataUnchanged(existing, dto);

                // Normalize optional metadata field names for consistency
                List<String> normalizedOptional = dto.getOptionalMetadata() != null ?
                    dto.getOptionalMetadata().stream().map(String::toLowerCase).toList() : null;

                // Validate metadata rules against existing required + new optional
                validateMetadataRules(dto.getMetadataRules(), existing.getRequiredMetadata(), normalizedOptional);

                existing.setDisplayName(dto.getDisplayName());
                existing.setDescription(dto.getDescription());
                // Note: NOT updating requiredMetadata - it's immutable after creation
                existing.setOptionalMetadata(normalizedOptional);
                existing.setMetadataRules(dto.getMetadataRules());
                existing.setActive(dto.getActive());
                existing.setUpdatedAt(Instant.now());
                return repository.save(existing);
            });
    }
    
    public List<Context> getAllContexts() {
        return repository.findAll();
    }

    public List<ContextWithCountDTO> getAllContextsWithCounts() {
        return repository.findAll().stream()
            .map(context -> {
                long count = catalogRepository.countByContextId(context.getContextId());
                return ContextWithCountDTO.from(context, count);
            })
            .toList();
    }

    public List<Context> getActiveContexts() {
        return repository.findByActiveTrue();
    }

    public Set<String> getActiveContextIds() {
        return repository.findByActiveTrue().stream()
            .map(Context::getContextId)
            .collect(java.util.stream.Collectors.toSet());
    }
    
    public Optional<Context> getContext(String contextId) {
        return repository.findById(contextId);
    }
    
    public boolean deleteContext(String contextId) {
        if (repository.existsById(contextId)) {
            // First delete all catalog entries associated with this context
            catalogRepository.deleteByContextId(contextId);
            // Then delete the context itself
            repository.deleteById(contextId);
            return true;
        }
        return false;
    }
    
    public boolean contextExists(String contextId) {
        return repository.existsById(contextId);
    }
    
    private void validateRequiredMetadataUnchanged(Context existing, ContextDefinitionDTO dto) {
        List<String> existingRequired = existing.getRequiredMetadata();
        List<String> newRequired = dto.getRequiredMetadata() != null ?
            dto.getRequiredMetadata().stream().map(String::toLowerCase).toList() : null;

        // Convert to sets for comparison (order doesn't matter, case-insensitive)
        Set<String> existingSet = new HashSet<>(existingRequired != null ? existingRequired : List.of());
        Set<String> newSet = new HashSet<>(newRequired != null ? newRequired : List.of());

        if (!existingSet.equals(newSet)) {
            throw new IllegalArgumentException(
                "Required metadata cannot be changed after context creation. " +
                "Existing: " + existingRequired + ", " +
                "Attempted: " + dto.getRequiredMetadata() + ". " +
                "Create a new context for different required metadata."
            );
        }
    }

    /**
     * Validates metadata extraction rules.
     * - Keys must match declared required or optional metadata fields
     * - XPaths must start with '/' and be non-empty
     * - XPath lists cannot be empty
     */
    private void validateMetadataRules(java.util.Map<String, List<String>> rules,
                                       List<String> requiredMetadata,
                                       List<String> optionalMetadata) {
        if (rules == null || rules.isEmpty()) {
            return; // No rules is valid
        }

        // Build set of all valid metadata field names (lowercase)
        Set<String> validFields = new HashSet<>();
        if (requiredMetadata != null) {
            validFields.addAll(requiredMetadata.stream().map(String::toLowerCase).toList());
        }
        if (optionalMetadata != null) {
            validFields.addAll(optionalMetadata.stream().map(String::toLowerCase).toList());
        }

        for (java.util.Map.Entry<String, List<String>> entry : rules.entrySet()) {
            String fieldName = entry.getKey();
            List<String> xpaths = entry.getValue();

            // Validate field name matches a declared metadata field
            if (fieldName == null || fieldName.isBlank()) {
                throw new IllegalArgumentException("Metadata rule field name cannot be empty");
            }
            String normalizedFieldName = fieldName.toLowerCase().trim();
            if (!validFields.contains(normalizedFieldName)) {
                throw new IllegalArgumentException(
                    "Metadata rule field '" + fieldName + "' is not declared in required or optional metadata. " +
                    "Valid fields are: " + validFields
                );
            }

            // Validate XPath list
            if (xpaths == null || xpaths.isEmpty()) {
                throw new IllegalArgumentException(
                    "Metadata rule for field '" + fieldName + "' must have at least one XPath"
                );
            }

            // Validate each XPath
            for (int i = 0; i < xpaths.size(); i++) {
                String xpath = xpaths.get(i);
                if (xpath == null || xpath.isBlank()) {
                    throw new IllegalArgumentException(
                        "Metadata rule for field '" + fieldName + "': XPath at index " + i + " cannot be empty"
                    );
                }
                if (!xpath.startsWith("/")) {
                    throw new IllegalArgumentException(
                        "Metadata rule for field '" + fieldName + "': XPath '" + xpath + "' must start with '/'"
                    );
                }
            }
        }
    }
}