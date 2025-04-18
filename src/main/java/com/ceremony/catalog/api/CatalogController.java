package com.ceremony.catalog.api;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.api.dto.CatalogSearchCriteria;
import com.ceremony.catalog.domain.CatalogEntry;
import com.ceremony.catalog.service.CatalogService;
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
    public void submitObservations(@RequestBody List<CatalogObservationDTO> observations) {
        catalogService.merge(observations);
    }
    @GetMapping("/fields")
    public Page<CatalogEntry> searchCatalog(
        @RequestParam(required = false) String pathType,
        @RequestParam(required = false) String formCode,
        @RequestParam(required = false) String formVersion,
        @RequestParam(required = false) String action,
        @RequestParam(required = false) String productCode,
        @RequestParam(required = false) String productSubCode,
        @RequestParam(required = false) String loanProductCode,
        @RequestParam(required = false) String xpathContains,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        CatalogSearchCriteria criteria = new CatalogSearchCriteria(
            pathType,
            formCode,
            formVersion,
            action,
            productCode,
            productSubCode,
            loanProductCode,
            xpathContains
        );
        Pageable pageable = PageRequest.of(page, size);
        return catalogService.find(
            criteria.pathType(),
            criteria.formCode(),
            criteria.formVersion(),
            pageable
        );
    }
}
