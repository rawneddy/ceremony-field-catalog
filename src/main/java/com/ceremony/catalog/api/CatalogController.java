package com.ceremony.catalog.api;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.api.dto.CatalogSearchRequest;
import com.ceremony.catalog.api.dto.ErrorResponse;
import com.ceremony.catalog.config.CatalogProperties;
import com.ceremony.catalog.domain.CatalogEntry;
import com.ceremony.catalog.service.CatalogService;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/catalog")
@RequiredArgsConstructor
@Tag(name = "Field Catalog", description = "API for managing field observations and searching the catalog")
public class CatalogController {
    private final CatalogService catalogService;
    private final CatalogProperties catalogProperties;
    
    @Operation(
        summary = "Submit field observations",
        description = "Submit a list of field observations for a specific context. The observations will be merged with existing catalog entries, updating occurrence statistics."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "204", 
            description = "Observations successfully processed and merged into catalog"
        ),
        @ApiResponse(
            responseCode = "400", 
            description = "Invalid input - context not found, missing required metadata, or validation error",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = ErrorResponse.class),
                examples = @ExampleObject(
                    value = """
                    {
                      "message": "Required metadata field missing: productCode",
                      "status": 400,
                      "timestamp": "2025-06-16T04:35:36.668959Z",
                      "error": "Bad Request"
                    }
                    """
                )
            )
        ),
        @ApiResponse(
            responseCode = "500",
            description = "Internal server error",
            content = @Content(
                mediaType = "application/json", 
                schema = @Schema(implementation = ErrorResponse.class)
            )
        )
    })
    @PostMapping("/contexts/{contextId}/observations")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void submitObservations(
            @Parameter(
                description = "Context ID for the observations (e.g., 'deposits', 'loans', 'ondemand')",
                example = "deposits",
                required = true
            )
            @PathVariable String contextId,
            @Parameter(
                description = "List of field observations to submit",
                required = true
            )
            @Valid @RequestBody List<CatalogObservationDTO> observations) {
        catalogService.merge(contextId, observations);
    }
    
    @Operation(
        summary = "Search catalog fields",
        description = "Search for field entries in the catalog using various criteria. Supports context-based filtering, metadata filtering, and field path pattern matching. Results are paginated."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Search results returned successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Page.class),
                examples = @ExampleObject(
                    value = """
                    {
                      "content": [
                        {
                          "id": "field_377301301",
                          "contextId": "deposits",
                          "metadata": {
                            "action": "Fulfillment",
                            "productCode": "DDA",
                            "productSubCode": "4S"
                          },
                          "fieldPath": "/Ceremony/Accounts/Account/FeeCode/Amount",
                          "maxOccurs": 1,
                          "minOccurs": 1,
                          "allowsNull": false,
                          "allowsEmpty": false
                        }
                      ],
                      "totalElements": 1,
                      "totalPages": 1,
                      "first": true,
                      "last": true,
                      "numberOfElements": 1
                    }
                    """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid search parameters",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = ErrorResponse.class)
            )
        )
    })
    @GetMapping("/fields")
    public Page<CatalogEntry> searchCatalog(
            @Parameter(
                description = "Search criteria including context, metadata filters, field path patterns, and pagination",
                required = false
            )
            @Valid CatalogSearchRequest request) {
        // Apply configuration-based defaults and limits
        int pageSize = request.size();
        if (pageSize <= 0) {
            pageSize = catalogProperties.getSearch().getDefaultPageSize();
        }
        if (pageSize > catalogProperties.getSearch().getMaxPageSize()) {
            pageSize = catalogProperties.getSearch().getMaxPageSize();
        }
        
        Pageable pageable = PageRequest.of(request.page(), pageSize);
        return catalogService.find(request.toCriteria(), pageable);
    }
}