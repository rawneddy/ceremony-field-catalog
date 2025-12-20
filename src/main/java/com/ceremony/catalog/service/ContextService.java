package com.ceremony.catalog.service;

import com.ceremony.catalog.api.dto.ContextDefinitionDTO;
import com.ceremony.catalog.api.dto.ContextWithCountDTO;
import com.ceremony.catalog.api.dto.MetadataExtractionRuleDTO;
import com.ceremony.catalog.domain.Context;
import com.ceremony.catalog.domain.MetadataExtractionRule;
import com.ceremony.catalog.persistence.CatalogRepository;
import com.ceremony.catalog.persistence.ContextRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

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

        // Validate and convert metadata rules
        validateMetadataRules(dto.getMetadataRules(), normalizedRequired, normalizedOptional);
        Map<String, MetadataExtractionRule> domainRules = convertToDomainRules(dto.getMetadataRules());

        Context context = Context.builder()
            .contextId(cleanedContextId)
            .displayName(dto.getDisplayName())
            .description(dto.getDescription())
            .requiredMetadata(normalizedRequired)
            .optionalMetadata(normalizedOptional)
            .metadataRules(domainRules)
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

                // Validate and convert metadata rules
                validateMetadataRules(dto.getMetadataRules(), existing.getRequiredMetadata(), normalizedOptional);
                Map<String, MetadataExtractionRule> domainRules = convertToDomainRules(dto.getMetadataRules());

                existing.setDisplayName(dto.getDisplayName());
                existing.setDescription(dto.getDescription());
                // Note: NOT updating requiredMetadata - it's immutable after creation
                existing.setOptionalMetadata(normalizedOptional);
                existing.setMetadataRules(domainRules);
                existing.setActive(dto.getActive());
                existing.setUpdatedAt(Instant.now());
                return repository.save(existing);
            });
    }
    
    public List<Context> getAllContexts() {
        return repository.findAll();
    }

    public List<ContextWithCountDTO> getAllContextsWithCounts() {
        // Fetch all contexts and counts in just 2 queries (instead of N+1)
        List<Context> contexts = repository.findAll();
        Map<String, Long> counts = catalogRepository.countGroupedByContextId();

        return contexts.stream()
            .map(context -> {
                long count = counts.getOrDefault(context.getContextId(), 0L);
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
     * - Validation regex (if provided) must be a valid regex pattern
     */
    private void validateMetadataRules(Map<String, MetadataExtractionRuleDTO> rules,
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

        for (Map.Entry<String, MetadataExtractionRuleDTO> entry : rules.entrySet()) {
            String fieldName = entry.getKey();
            MetadataExtractionRuleDTO rule = entry.getValue();

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

            if (rule == null) {
                throw new IllegalArgumentException(
                    "Metadata rule for field '" + fieldName + "' cannot be null"
                );
            }

            List<String> xpaths = rule.getXpaths();

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

            // Validate regex pattern if provided
            String regex = rule.getValidationRegex();
            if (regex != null && !regex.isBlank()) {
                try {
                    Pattern.compile(regex);
                } catch (PatternSyntaxException e) {
                    throw new IllegalArgumentException(
                        "Metadata rule for field '" + fieldName + "': Invalid regex pattern '" + regex + "': " + e.getMessage()
                    );
                }
            }
        }
    }

    /**
     * Converts DTO rules to domain rules.
     * - Field names are lowercased for consistency
     * - XPaths are lowercased for case-insensitive matching
     * - Validation regex is preserved as-is (user's responsibility)
     */
    private Map<String, MetadataExtractionRule> convertToDomainRules(Map<String, MetadataExtractionRuleDTO> dtoRules) {
        if (dtoRules == null) {
            return null;
        }

        Map<String, MetadataExtractionRule> domainRules = new HashMap<>();
        for (Map.Entry<String, MetadataExtractionRuleDTO> entry : dtoRules.entrySet()) {
            MetadataExtractionRuleDTO dto = entry.getValue();

            // Lowercase all XPaths for case-insensitive matching
            List<String> normalizedXpaths = dto.getXpaths().stream()
                .map(String::toLowerCase)
                .toList();

            MetadataExtractionRule domainRule = MetadataExtractionRule.builder()
                .xpaths(normalizedXpaths)
                .validationRegex(dto.getValidationRegex())  // Preserve regex as-is
                .build();

            // Lowercase field name key for consistency
            domainRules.put(entry.getKey().toLowerCase(), domainRule);
        }
        return domainRules;
    }
}