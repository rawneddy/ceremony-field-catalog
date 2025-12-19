package com.ceremony.catalog.persistence;

import com.ceremony.catalog.api.dto.CatalogSearchCriteria;
import com.ceremony.catalog.domain.CatalogEntry;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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
        // Delegate to the method with activeContextIds=null (no context filtering)
        return searchByCriteria(criteriaDto, null, pageable);
    }

    @Override
    public Page<CatalogEntry> searchByCriteria(CatalogSearchCriteria criteriaDto, Set<String> activeContextIds, Pageable pageable) {
        // Check if this is a global search (q parameter)
        if (criteriaDto.isGlobalSearch()) {
            return executeGlobalSearch(criteriaDto, activeContextIds, pageable);
        } else {
            return executeFilterSearch(criteriaDto, activeContextIds, pageable);
        }
    }

    /**
     * Execute global search using aggregation to search fieldPath, contextId, AND metadata values.
     * Uses MongoDB aggregation with $objectToArray to search all metadata values.
     */
    private Page<CatalogEntry> executeGlobalSearch(CatalogSearchCriteria criteriaDto, Set<String> activeContextIds, Pageable pageable) {
        String searchPattern = criteriaDto.getSearchPattern();

        // Build the $match stage with OR conditions for fieldPath, contextId, and metadata values
        // The metadata value search uses $expr with $anyElementTrue to check all values in the map
        Document matchConditions = new Document("$or", Arrays.asList(
            // Match fieldPath
            new Document("fieldpath", new Document("$regex", searchPattern)),
            // Match contextId
            new Document("contextid", new Document("$regex", searchPattern)),
            // Match any metadata value using $expr and $objectToArray
            new Document("$expr", new Document("$anyElementTrue",
                new Document("$map", new Document()
                    .append("input", new Document("$objectToArray", "$metadata"))
                    .append("as", "m")
                    .append("in", new Document("$regexMatch", new Document()
                        .append("input", "$$m.v")
                        .append("regex", searchPattern)
                    ))
                )
            ))
        ));

        // Add active context filter
        Document matchStage;
        if (activeContextIds != null && !activeContextIds.isEmpty()) {
            matchStage = new Document("$match", new Document("$and", Arrays.asList(
                matchConditions,
                new Document("contextid", new Document("$in", new ArrayList<>(activeContextIds)))
            )));
        } else {
            matchStage = new Document("$match", matchConditions);
        }

        // Build aggregation pipeline for counting
        List<AggregationOperation> countPipeline = new ArrayList<>();
        countPipeline.add(context -> matchStage);
        countPipeline.add(context -> new Document("$count", "total"));

        AggregationResults<Document> countResults = mongoTemplate.aggregate(
            Aggregation.newAggregation(countPipeline),
            "catalog_fields",
            Document.class
        );

        long total = 0;
        if (!countResults.getMappedResults().isEmpty()) {
            total = countResults.getMappedResults().get(0).getInteger("total", 0);
        }

        // Build aggregation pipeline for results
        List<AggregationOperation> resultPipeline = new ArrayList<>();
        resultPipeline.add(context -> matchStage);

        // Add sorting
        Document sortDoc = pageable.getSort().isUnsorted()
            ? new Document("fieldpath", 1)
            : buildSortDocument(pageable.getSort());
        resultPipeline.add(context -> new Document("$sort", sortDoc));

        // Add pagination
        if (pageable.isPaged()) {
            resultPipeline.add(context -> new Document("$skip", (int) pageable.getOffset()));
            resultPipeline.add(context -> new Document("$limit", pageable.getPageSize()));
        }

        AggregationResults<CatalogEntry> results = mongoTemplate.aggregate(
            Aggregation.newAggregation(resultPipeline),
            "catalog_fields",
            CatalogEntry.class
        );

        return new PageImpl<>(results.getMappedResults(), pageable, total);
    }

    /**
     * Execute filter-based search using Query API (more efficient for indexed fields).
     */
    private Page<CatalogEntry> executeFilterSearch(CatalogSearchCriteria criteriaDto, Set<String> activeContextIds, Pageable pageable) {
        Query query = new Query();
        List<Criteria> filters = new ArrayList<>();

        // Filter by context if specified
        if (criteriaDto.contextId() != null) {
            // Specific context requested - verify it's in active set
            if (activeContextIds != null && !activeContextIds.contains(criteriaDto.contextId())) {
                // Requested context is not active - return empty results
                return new PageImpl<>(List.of(), pageable, 0);
            }
            filters.add(Criteria.where("contextid").is(criteriaDto.contextId()));
        } else {
            // No specific context - filter to active contexts only
            if (activeContextIds != null && !activeContextIds.isEmpty()) {
                filters.add(Criteria.where("contextid").in(activeContextIds));
            }
        }

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

        // Filter by field path pattern if specified
        // Use escaped pattern for literal matching when useRegex is false
        Optional.ofNullable(criteriaDto.fieldPathContains())
            .ifPresent(v -> {
                String pattern = criteriaDto.useRegex() ? v : escapeRegex(v);
                filters.add(Criteria.where("fieldpath").regex(pattern));
            });

        if (!filters.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(filters.toArray(new Criteria[0])));
        }

        // Apply sorting by field path by default
        if (pageable.getSort().isUnsorted()) {
            query.with(Sort.by(Sort.Direction.ASC, "fieldpath"));
        }

        long total = mongoTemplate.count(query, CatalogEntry.class);
        List<CatalogEntry> entries = mongoTemplate.find(query.with(pageable), CatalogEntry.class);

        return new PageImpl<>(entries, pageable, total);
    }

    /**
     * Build a MongoDB sort document from Spring Data Sort.
     */
    private Document buildSortDocument(Sort sort) {
        Document sortDoc = new Document();
        sort.forEach(order -> sortDoc.append(
            order.getProperty(),
            order.isAscending() ? 1 : -1
        ));
        return sortDoc;
    }

    /**
     * Escape regex special characters for literal string matching.
     */
    private String escapeRegex(String input) {
        if (input == null) return null;
        return input.replaceAll("([\\\\\\[\\](){}.*+?^$|])", "\\\\$1");
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

    @Override
    public List<String> suggestValues(String field, String prefix, String contextId, Map<String, String> metadata, Set<String> activeContextIds, int limit) {
        Query query = new Query();

        // Add context filter if provided
        if (contextId != null && !contextId.trim().isEmpty()) {
            // Verify the specified context is active
            if (activeContextIds != null && !activeContextIds.contains(contextId)) {
                return List.of(); // Context is not active, return empty suggestions
            }
            query.addCriteria(Criteria.where("contextid").is(contextId));
        } else {
            // No specific context - filter to active contexts only
            if (activeContextIds != null && !activeContextIds.isEmpty()) {
                query.addCriteria(Criteria.where("contextid").in(activeContextIds));
            }
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