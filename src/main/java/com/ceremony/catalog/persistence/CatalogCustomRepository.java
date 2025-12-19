package com.ceremony.catalog.persistence;

import com.ceremony.catalog.api.dto.CatalogSearchCriteria;
import com.ceremony.catalog.domain.CatalogEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Map;
import java.util.Set;

public interface CatalogCustomRepository {
    List<CatalogEntry> searchByCriteria(CatalogSearchCriteria criteria);
    Page<CatalogEntry> searchByCriteria(CatalogSearchCriteria criteria, Pageable pageable);

    /**
     * Search with active context filtering.
     * When no specific contextId is in criteria, results are filtered to only include
     * entries from active contexts.
     *
     * @param criteria search criteria
     * @param activeContextIds set of active context IDs to filter by
     * @param pageable pagination parameters
     * @return page of matching entries from active contexts only
     */
    Page<CatalogEntry> searchByCriteria(CatalogSearchCriteria criteria, Set<String> activeContextIds, Pageable pageable);

    /**
     * Optimized query to find field paths by context and metadata.
     * Returns only the field path values for minimal data transfer and memory usage.
     *
     * @param contextId the context ID to filter by
     * @param metadata the metadata key-value pairs to filter by
     * @return list of distinct field path strings matching the criteria
     */
    List<String> findFieldPathsByContextAndMetadata(String contextId, Map<String, String> metadata);

    /**
     * Suggest values for autocomplete based on field and prefix.
     * Supports both fieldPath and metadata value suggestions.
     *
     * @param field the field to suggest for ("fieldPath" or "metadata.{name}")
     * @param prefix the prefix to match (case-insensitive)
     * @param contextId optional context to scope the search
     * @param metadata optional metadata filters to scope the search
     * @param limit maximum number of suggestions to return
     * @return list of distinct values matching the prefix
     */
    List<String> suggestValues(String field, String prefix, String contextId, Map<String, String> metadata, int limit);

    /**
     * Suggest values with active context filtering.
     * When no specific contextId is provided, suggestions are filtered to only include
     * values from active contexts.
     *
     * @param field the field to suggest for ("fieldPath" or "metadata.{name}")
     * @param prefix the prefix to match (case-insensitive)
     * @param contextId optional context to scope the search
     * @param metadata optional metadata filters to scope the search
     * @param activeContextIds set of active context IDs to filter by
     * @param limit maximum number of suggestions to return
     * @return list of distinct values matching the prefix from active contexts only
     */
    List<String> suggestValues(String field, String prefix, String contextId, Map<String, String> metadata, Set<String> activeContextIds, int limit);

    /**
     * Suggest field paths based on a global match across any field (discovery mode).
     *
     * @param searchTerm the term to search for across all fields
     * @param contextId optional context to scope the search
     * @param metadata optional metadata filters to scope the search
     * @param activeContextIds set of active context IDs to filter by
     * @param limit maximum number of suggestions to return
     * @return list of distinct field path strings matching the discovery criteria
     */
    List<String> discoverySuggest(String searchTerm, String contextId, Map<String, String> metadata, Set<String> activeContextIds, int limit);

    /**
     * Count total fields by context ID.
     *
     * @param contextId the context ID to count fields for
     * @return the number of fields in the context
     */
    long countByContextId(String contextId);
}
