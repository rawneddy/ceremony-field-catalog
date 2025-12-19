package com.ceremony.catalog.persistence;

import com.ceremony.catalog.domain.CatalogEntry;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CatalogRepository extends MongoRepository<CatalogEntry, String>, CatalogCustomRepository {
    // All querying should go through searchByCriteria in the custom repo

    /**
     * Delete all catalog entries for a given context.
     * Used when deleting a context to cascade the delete to associated fields.
     */
    void deleteByContextId(String contextId);
}
