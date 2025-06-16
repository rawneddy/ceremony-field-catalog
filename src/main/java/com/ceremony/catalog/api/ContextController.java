package com.ceremony.catalog.api;

import com.ceremony.catalog.api.dto.ContextDefinitionDTO;
import com.ceremony.catalog.domain.Context;  
import com.ceremony.catalog.service.ContextService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/catalog/contexts")
@RequiredArgsConstructor
public class ContextController {
    private final ContextService contextService;
    
    @PostMapping
    public ResponseEntity<Context> createContext(@Valid @RequestBody ContextDefinitionDTO dto) {
        Context context = contextService.createContext(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(context);
    }
    
    @GetMapping
    public List<Context> getAllContexts() {
        return contextService.getAllContexts();
    }
    
    @GetMapping("/{contextId}")
    public ResponseEntity<Context> getContext(@PathVariable String contextId) {
        return contextService.getContext(contextId)
            .map(context -> ResponseEntity.ok(context))
            .orElse(ResponseEntity.notFound().build());
    }
    
    @PutMapping("/{contextId}")
    public ResponseEntity<Context> updateContext(
            @PathVariable String contextId,
            @Valid @RequestBody ContextDefinitionDTO dto) {
        return contextService.updateContext(contextId, dto)
            .map(context -> ResponseEntity.ok(context))
            .orElse(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/{contextId}")
    public ResponseEntity<Void> deleteContext(@PathVariable String contextId) {
        boolean deleted = contextService.deleteContext(contextId);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}