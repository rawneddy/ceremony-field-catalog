package com.ceremony.catalog.persistence;

import com.ceremony.catalog.api.dto.CatalogSearchCriteria;
import com.ceremony.catalog.domain.CatalogEntry;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
@SuppressWarnings("null") // Spring Data MongoDB Criteria API null safety
public class CatalogCustomRepositoryImpl implements CatalogCustomRepository {

    private final MongoTemplate mongoTemplate;

    @PostConstruct
    private void createIndexes() {
        var indexOps = mongoTemplate.indexOps(CatalogEntry.class);

        // Primary index for context-based queries
        indexOps.ensureIndex(new Index()
            .on("contextid", Sort.Direction.ASC)
            .on("fieldpath", Sort.Direction.ASC));

        // Index for field path pattern searches
        indexOps.ensureIndex(new Index()
            .on("fieldpath", Sort.Direction.ASC));

        // Optimized compound index for findFieldPathsByContextAndMetadata queries
        indexOps.ensureIndex(new Index()
            .on("contextid", Sort.Direction.ASC)
            .on("metadata", Sort.Direction.ASC)
            .named("idx_context_metadata_fieldpath_optimized"));
    }

    @Override
    public List<CatalogEntry> searchByCriteria(CatalogSearchCriteria criteriaDto) {
        return searchByCriteria(criteriaDto, Pageable.unpaged()).getContent();
    }

    @Override
    public Page<CatalogEntry> searchByCriteria(CatalogSearchCriteria criteriaDto, Pageable pageable) {
        Query query = new Query();

        // Check if this is a global search (q parameter)
        if (criteriaDto.isGlobalSearch()) {
            // Global search: OR across fieldPath and contextId
            // Note: Metadata value search is not included in global search because MongoDB
            // cannot efficiently regex search all values of an embedded document.
            // Use Advanced Search (filter mode) for metadata-specific queries.
            String searchTerm = criteriaDto.q();
            List<Criteria> orCriteria = new ArrayList<>();

            // Search in fieldPath (contains) - uses index
            orCriteria.add(Criteria.where("fieldpath").regex(searchTerm));

            // Search in contextId (contains) - uses index
            orCriteria.add(Criteria.where("contextid").regex(searchTerm));

            query.addCriteria(new Criteria().orOperator(orCriteria.toArray(new Criteria[0])));
        } else {
            // Filter-based search: AND logic
            List<Criteria> filters = new ArrayList<>();

            // Filter by context if specified
            Optional.ofNullable(criteriaDto.contextId())
                .ifPresent(v -> filters.add(Criteria.where("contextid").is(v)));

            // Filter by metadata fields if specified
            Optional.ofNullable(criteriaDto.metadata())
                .ifPresent(metadata -> {
                    for (Map.Entry<String, String> entry : metadata.entrySet()) {
                        String key = entry.getKey();
                        String value = entry.getValue();
                        if (value != null && !value.trim().isEmpty()) {
                            filters.add(Criteria.where("metadata." + key).is(value));
                        }
                    }
                });

            // Filter by field path pattern if specified (no "i" flag needed - data is lowercase)
            Optional.ofNullable(criteriaDto.fieldPathContains())
                .ifPresent(v -> filters.add(Criteria.where("fieldpath").regex(v)));

            if (!filters.isEmpty()) {
                query.addCriteria(new Criteria().andOperator(filters.toArray(new Criteria[0])));
            }
        }

        // Apply sorting by field path by default
        if (pageable.getSort().isUnsorted()) {
            query.with(Sort.by(Sort.Direction.ASC, "fieldpath"));
        }

        long total = mongoTemplate.count(query, CatalogEntry.class);
        List<CatalogEntry> entries = mongoTemplate.find(query.with(pageable), CatalogEntry.class);

        return new PageImpl<>(entries, pageable, total);
    }

    @Override
    public List<String> findFieldPathsByContextAndMetadata(String contextId, Map<String, String> metadata) {
        Query query = new Query();

        // Add context filter
        if (contextId != null && !contextId.trim().isEmpty()) {
            query.addCriteria(Criteria.where("contextid").is(contextId));
        }

        // Add metadata criteria dynamically
        if (metadata != null && !metadata.isEmpty()) {
            for (Map.Entry<String, String> entry : metadata.entrySet()) {
                String key = entry.getKey();
                String value = entry.getValue();
                if (key != null && !key.trim().isEmpty() && value != null && !value.trim().isEmpty()) {
                    query.addCriteria(Criteria.where("metadata." + key).is(value));
                }
            }
        }

        // Project only fieldpath field for minimal data transfer
        query.fields().include("fieldpath");

        // Execute query and extract distinct field path values
        return mongoTemplate.find(query, CatalogEntry.class)
            .stream()
            .map(CatalogEntry::getFieldPath)
            .filter(fieldPath -> fieldPath != null && !fieldPath.trim().isEmpty())
            .distinct()
            .collect(Collectors.toList());
    }

    @Override
    public List<String> suggestValues(String field, String prefix, String contextId, Map<String, String> metadata, int limit) {
        Query query = new Query();

        // Add context filter if provided
        if (contextId != null && !contextId.trim().isEmpty()) {
            query.addCriteria(Criteria.where("contextid").is(contextId));
        }

        // Add metadata filters if provided
        if (metadata != null && !metadata.isEmpty()) {
            for (Map.Entry<String, String> entry : metadata.entrySet()) {
                String key = entry.getKey();
                String value = entry.getValue();
                if (key != null && !key.trim().isEmpty() && value != null && !value.trim().isEmpty()) {
                    query.addCriteria(Criteria.where("metadata." + key).is(value));
                }
            }
        }

        // Normalize field name to lowercase for MongoDB query
        String normalizedField = field.toLowerCase();

        // Add prefix filter (no "i" flag needed - data and prefix are lowercase)
        if (prefix != null && !prefix.trim().isEmpty()) {
            // Escape regex special characters in prefix
            String escapedPrefix = prefix.replaceAll("([\\\\\\[\\](){}.*+?^$|])", "\\\\$1");
            query.addCriteria(Criteria.where(normalizedField).regex("^" + escapedPrefix));
        }

        // Project only the field we need
        query.fields().include(normalizedField);

        // Execute query and extract distinct values
        List<CatalogEntry> results = mongoTemplate.find(query, CatalogEntry.class);

        return results.stream()
            .map(entry -> extractFieldValue(entry, normalizedField))
            .filter(value -> value != null && !value.trim().isEmpty())
            .distinct()
            .sorted()
            .limit(limit)
            .collect(Collectors.toList());
    }

    private String extractFieldValue(CatalogEntry entry, String field) {
        if ("fieldpath".equals(field)) {
            return entry.getFieldPath();
        } else if (field.startsWith("metadata.")) {
            // All keys are lowercase
            String metadataKey = field.substring("metadata.".length());
            Map<String, String> metadata = entry.getMetadata();
            return metadata != null ? metadata.get(metadataKey) : null;
        }
        return null;
    }

    @Override
    public long countByContextId(String contextId) {
        if (contextId == null || contextId.trim().isEmpty()) {
            return 0;
        }
        Query query = new Query();
        query.addCriteria(Criteria.where("contextid").is(contextId));
        return mongoTemplate.count(query, CatalogEntry.class);
    }
}