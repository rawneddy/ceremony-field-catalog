package com.ceremony.catalog.persistence;

import com.ceremony.catalog.api.dto.CatalogSearchCriteria;
import com.ceremony.catalog.domain.CatalogEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface CatalogCustomRepository {
    List<CatalogEntry> searchByCriteria(CatalogSearchCriteria criteria);
    Page<CatalogEntry> searchByCriteria(CatalogSearchCriteria criteria, Pageable pageable);
}
