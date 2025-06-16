package com.ceremony.catalog.service;

import com.ceremony.catalog.api.dto.ContextDefinitionDTO;
import com.ceremony.catalog.domain.Context;
import com.ceremony.catalog.persistence.ContextRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

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
                existing.setDisplayName(dto.displayName());
                existing.setDescription(dto.description());
                existing.setRequiredMetadata(dto.requiredMetadata());
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
}