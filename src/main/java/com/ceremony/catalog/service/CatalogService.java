package com.ceremony.catalog.service;

import com.ceremony.catalog.api.dto.CatalogObservationDTO;
import com.ceremony.catalog.api.dto.CatalogSearchCriteria;
import com.ceremony.catalog.domain.CatalogEntry;
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
public class CatalogService {
    private final CatalogRepository repository;
    public void merge(List<CatalogObservationDTO> observations) {
        if (observations == null || observations.isEmpty()) return;
        for (CatalogObservationDTO dto : observations) {
            ContextKey contextKey = new ContextKey(
                dto.pathType(),
                dto.formCode(),
                dto.formVersion(),
                dto.action(),
                dto.productCode(),
                dto.productSubCode(),
                dto.loanProductCode()
            );
            FieldKey fieldKey = new FieldKey(
                dto.pathType(),
                dto.formCode(),
                dto.formVersion(),
                dto.action(),
                dto.productCode(),
                dto.productSubCode(),
                dto.loanProductCode(),
                dto.dataType(),
                dto.xpath()
            );
            String id = fieldKey.toString();
            Optional<CatalogEntry> existing = repository.findById(id);
            if (existing.isPresent()) {
                CatalogEntry entry = existing.get();
                entry.setMaxOccurs(Math.max(entry.getMaxOccurs(), dto.count()));
                entry.setMinOccurs(Math.min(entry.getMinOccurs(), dto.count()));
                entry.setAllowsNull(entry.isAllowsNull() || dto.hasNull());
                entry.setAllowsEmpty(entry.isAllowsEmpty() || dto.hasEmpty());
                repository.save(entry);
            } else {
                CatalogEntry newEntry = CatalogEntry.builder()
                    .id(id)
                    .pathType(dto.pathType())
                    .formCode(dto.formCode())
                    .formVersion(dto.formVersion())
                    .action(dto.action())
                    .productCode(dto.productCode())
                    .productSubCode(dto.productSubCode())
                    .loanProductCode(dto.loanProductCode())
                    .xpath(dto.xpath())
                    .dataType(dto.dataType())
                    .maxOccurs(dto.count())
                    .minOccurs(dto.count())
                    .allowsNull(dto.hasNull())
                    .allowsEmpty(dto.hasEmpty())
                    .build();
                repository.save(newEntry);
            }
            if (observations.stream()
                .map(o -> new ContextKey(
                    o.pathType(), o.formCode(), o.formVersion(),
                    o.action(), o.productCode(), o.productSubCode(), o.loanProductCode()))
                .distinct().count() == 1) {
                List<CatalogEntry> existingEntries = repository.searchByCriteria(new CatalogSearchCriteria(
                    dto.pathType(), dto.formCode(), dto.formVersion(),
                    dto.action(), dto.productCode(), dto.productSubCode(), dto.loanProductCode(), null));
                Set<String> currentXpaths = new HashSet<>();
                for (CatalogObservationDTO d : observations) {
                    currentXpaths.add(d.xpath());
                }
                for (CatalogEntry entry : existingEntries) {
                    if (!currentXpaths.contains(entry.getXpath())) {
                        entry.setMinOccurs(0);
                        repository.save(entry);
                    }
                }
            }
        }
    }
    public Page<CatalogEntry> find(String pathType, String formCode, String formVersion, Pageable pageable) {
        CatalogSearchCriteria criteria = new CatalogSearchCriteria(
            pathType, formCode, formVersion, null, null, null, null, null
        );
        return repository.searchByCriteria(criteria, pageable);
    }
}
