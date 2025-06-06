package com.ceremony.catalog.api;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.api.dto.CatalogSearchRequest;
import com.ceremony.catalog.domain.CatalogEntry;
import com.ceremony.catalog.service.CatalogService;
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
public class CatalogController {
    private final CatalogService catalogService;
    @PostMapping("/observed-fields")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void submitObservations(@Valid @RequestBody List<CatalogObservationDTO> observations) {
        catalogService.merge(observations);
    }
    
    @GetMapping("/fields")
    public Page<CatalogEntry> searchCatalog(@Valid @ModelAttribute CatalogSearchRequest request) {
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize());
        return catalogService.find(request.toCriteria(), pageable);
    }
}
