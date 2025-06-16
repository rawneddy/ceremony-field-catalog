package com.ceremony.catalog.service;

import com.ceremony.catalog.api.dto.ContextDefinitionDTO;
import com.ceremony.catalog.domain.Context;
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
public class ContextService {
    private final ContextRepository repository;
    
    public Context createContext(ContextDefinitionDTO dto) {
        Context context = Context.builder()
            .contextId(dto.contextId())
            .displayName(dto.displayName())
            .description(dto.description())
            .requiredMetadata(dto.requiredMetadata())
            .optionalMetadata(dto.optionalMetadata())
            .active(dto.active())
            .createdAt(Instant.now())
            .build();
            
        return repository.save(context);
    }
    
    public Optional<Context> updateContext(String contextId, ContextDefinitionDTO dto) {
        return repository.findById(contextId)
            .map(existing -> {
                // Validate that required metadata hasn't changed
                validateRequiredMetadataUnchanged(existing, dto);
                
                existing.setDisplayName(dto.displayName());
                existing.setDescription(dto.description());
                // Note: NOT updating requiredMetadata - it's immutable after creation
                existing.setOptionalMetadata(dto.optionalMetadata());
                existing.setActive(dto.active());
                existing.setUpdatedAt(Instant.now());
                return repository.save(existing);
            });
    }
    
    public List<Context> getAllContexts() {
        return repository.findAll();
    }
    
    public List<Context> getActiveContexts() {
        return repository.findByActiveTrue();
    }
    
    public Optional<Context> getContext(String contextId) {
        return repository.findById(contextId);
    }
    
    public boolean deleteContext(String contextId) {
        if (repository.existsById(contextId)) {
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
        List<String> newRequired = dto.requiredMetadata();
        
        // Convert to sets for comparison (order doesn't matter)
        Set<String> existingSet = new HashSet<>(existingRequired);
        Set<String> newSet = new HashSet<>(newRequired);
        
        if (!existingSet.equals(newSet)) {
            throw new IllegalArgumentException(
                "Required metadata cannot be changed after context creation. " +
                "Existing: " + existingRequired + ", " +
                "Attempted: " + newRequired + ". " +
                "Create a new context for different required metadata."
            );
        }
    }
}