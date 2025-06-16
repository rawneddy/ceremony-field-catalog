package com.ceremony.catalog.persistence;

import com.ceremony.catalog.api.dto.CatalogSearchCriteria;
import com.ceremony.catalog.domain.CatalogEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Map;

public interface CatalogCustomRepository {
    List<CatalogEntry> searchByCriteria(CatalogSearchCriteria criteria);
    Page<CatalogEntry> searchByCriteria(CatalogSearchCriteria criteria, Pageable pageable);
    
    /**
     * Optimized query to find XPath strings by context and metadata.
     * Returns only the XPath values for minimal data transfer and memory usage.
     * 
     * @param contextId the context ID to filter by
     * @param metadata the metadata key-value pairs to filter by
     * @return list of distinct XPath strings matching the criteria
     */
    List<String> findXpathsByContextAndMetadata(String contextId, Map<String, String> metadata);
}
