package com.ceremony.catalog.api;

import com.ceremony.catalog.api.dto.ContextDefinitionDTO;
import com.ceremony.catalog.api.dto.ErrorResponse;
import com.ceremony.catalog.domain.Context;  
import com.ceremony.catalog.service.ContextService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/catalog/contexts")
@RequiredArgsConstructor
@Tag(name = "Context Management", description = "API for managing catalog contexts that define metadata requirements and validation rules")
public class ContextController {
    private final ContextService contextService;
    
    @Operation(
        summary = "Create a new context",
        description = "Create a new catalog context that defines metadata requirements and validation rules for field observations."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "201",
            description = "Context created successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Context.class)
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid context definition",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = ErrorResponse.class)
            )
        )
    })
    @PostMapping
    public ResponseEntity<Context> createContext(
            @Parameter(
                description = "Context definition including metadata requirements",
                required = true
            )
            @Valid @RequestBody ContextDefinitionDTO dto) {
        Context context = contextService.createContext(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(context);
    }
    
    @Operation(
        summary = "Get all contexts",
        description = "Retrieve a list of all available catalog contexts."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "List of contexts returned successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Context.class)
            )
        )
    })
    @GetMapping
    public List<Context> getAllContexts() {
        return contextService.getAllContexts();
    }
    
    @Operation(
        summary = "Get context by ID",
        description = "Retrieve a specific catalog context by its ID."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Context found and returned",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Context.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Context not found"
        )
    })
    @GetMapping("/{contextId}")
    public ResponseEntity<Context> getContext(
            @Parameter(
                description = "Context ID to retrieve",
                example = "deposits",
                required = true
            )
            @PathVariable String contextId) {
        return contextService.getContext(contextId)
            .map(context -> ResponseEntity.ok(context))
            .orElse(ResponseEntity.notFound().build());
    }
    
    @Operation(
        summary = "Update context",
        description = "Update an existing catalog context definition."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Context updated successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Context.class)
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid context definition",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = ErrorResponse.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Context not found"
        )
    })
    @PutMapping("/{contextId}")
    public ResponseEntity<Context> updateContext(
            @Parameter(
                description = "Context ID to update",
                example = "deposits",
                required = true
            )
            @PathVariable String contextId,
            @Parameter(
                description = "Updated context definition",
                required = true
            )
            @Valid @RequestBody ContextDefinitionDTO dto) {
        return contextService.updateContext(contextId, dto)
            .map(context -> ResponseEntity.ok(context))
            .orElse(ResponseEntity.notFound().build());
    }
    
    @Operation(
        summary = "Delete context",
        description = "Delete a catalog context. This will also remove all associated field observations."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "204",
            description = "Context deleted successfully"
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Context not found"
        )
    })
    @DeleteMapping("/{contextId}")
    public ResponseEntity<Void> deleteContext(
            @Parameter(
                description = "Context ID to delete",
                example = "deposits",
                required = true
            )
            @PathVariable String contextId) {
        boolean deleted = contextService.deleteContext(contextId);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}