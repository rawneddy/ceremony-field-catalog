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

        // Build the discovery OR conditions (match ANY field)
        //
        // The third condition uses MongoDB aggregation operators to search across all metadata values:
        //
        // $objectToArray: Converts the metadata object (e.g., {"productCode": "DDA", "channel": "Online"})
        //                 into an array of {k, v} pairs: [{k: "productCode", v: "DDA"}, {k: "channel", v: "Online"}]
        //                 This allows iteration over dynamic/unknown metadata keys.
        //
        // $map: Iterates over each {k, v} pair from $objectToArray and applies $regexMatch to the value ($$m.v).
        //       Returns an array of booleans indicating whether each metadata value matches the search pattern.
        //
        // $anyElementTrue: Returns true if ANY element in the boolean array is true.
        //                  This achieves "match if any metadata value contains the search term" behavior.
        //
        // Example: searching for "online" would match a document with metadata.channel = "Online"
        Document discoveryConditions = new Document("$or", Arrays.asList(
            new Document("fieldpath", new Document("$regex", searchPattern)),
            new Document("contextid", new Document("$regex", searchPattern)),
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

        List<Document> andConditions = new ArrayList<>();
        andConditions.add(discoveryConditions);

        // Add scope filters (context/metadata)
        if (criteriaDto.contextId() != null) {
            if (activeContextIds != null && !activeContextIds.contains(criteriaDto.contextId())) {
                return new PageImpl<>(List.of(), pageable, 0);
            }
            andConditions.add(new Document("contextid", criteriaDto.contextId()));
        } else if (activeContextIds != null && !activeContextIds.isEmpty()) {
            andConditions.add(new Document("contextid", new Document("$in", new ArrayList<>(activeContextIds))));
        }

        if (criteriaDto.metadata() != null && !criteriaDto.metadata().isEmpty()) {
            for (Map.Entry<String, List<String>> entry : criteriaDto.metadata().entrySet()) {
                List<String> values = entry.getValue();
                if (values != null && !values.isEmpty()) {
                    if (values.size() == 1) {
                        // Single value - exact match
                        andConditions.add(new Document("metadata." + entry.getKey(), values.get(0)));
                    } else {
                        // Multiple values - OR logic using $in
                        andConditions.add(new Document("metadata." + entry.getKey(), new Document("$in", values)));
                    }
                }
            }
        }

        // If useRegex=false and fieldPathContains is provided, it acts as an additional AND filter
        if (criteriaDto.fieldPathContains() != null && !criteriaDto.fieldPathContains().trim().isEmpty()) {
            String pattern = criteriaDto.useRegex() ? criteriaDto.fieldPathContains() : escapeRegex(criteriaDto.fieldPathContains());
            andConditions.add(new Document("fieldpath", new Document("$regex", pattern)));
        }

        Document matchStage = new Document("$match", new Document("$and", andConditions));

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

        // Add sorting - default to lastobservedat DESC
        Document sortDoc = pageable.getSort().isUnsorted()
            ? new Document("lastobservedat", -1)
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
        // Supports multiple values per key (OR logic within field, AND logic between fields)
        Optional.ofNullable(criteriaDto.metadata())
            .ifPresent(metadata -> {
                for (Map.Entry<String, List<String>> entry : metadata.entrySet()) {
                    String key = entry.getKey();
                    List<String> values = entry.getValue();
                    if (values != null && !values.isEmpty()) {
                        if (values.size() == 1) {
                            // Single value - exact match
                            filters.add(Criteria.where("metadata." + key).is(values.get(0)));
                        } else {
                            // Multiple values - OR logic using $in
                            filters.add(Criteria.where("metadata." + key).in(values));
                        }
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

        // Apply sorting by lastobservedat DESC by default
        if (pageable.getSort().isUnsorted()) {
            query.with(Sort.by(Sort.Direction.DESC, "lastobservedat"));
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
        String normalizedField = field.toLowerCase();
        boolean isFieldPath = "fieldpath".equals(normalizedField);

        // Build match criteria
        List<Criteria> filters = new ArrayList<>();

        // Add context filter
        if (contextId != null && !contextId.trim().isEmpty()) {
            if (activeContextIds != null && !activeContextIds.contains(contextId)) {
                return List.of();
            }
            filters.add(Criteria.where("contextid").is(contextId));
        } else if (activeContextIds != null && !activeContextIds.isEmpty()) {
            filters.add(Criteria.where("contextid").in(activeContextIds));
        }

        // Add metadata filters
        if (metadata != null && !metadata.isEmpty()) {
            for (Map.Entry<String, String> entry : metadata.entrySet()) {
                String key = entry.getKey();
                String value = entry.getValue();
                if (key != null && !key.trim().isEmpty() && value != null && !value.trim().isEmpty()) {
                    filters.add(Criteria.where("metadata." + key).is(value));
                }
            }
        }

        // Add prefix filter
        if (prefix != null && !prefix.trim().isEmpty()) {
            String escapedPrefix = prefix.replaceAll("([\\\\\\[\\](){}.*+?^$|])", "\\\\$1");
            // If checking fieldPath, we check for containment anywhere if it doesn't start with /
            // If it starts with /, we anchor to start (prefix match)
            if (isFieldPath && !prefix.startsWith("/")) {
                filters.add(Criteria.where(normalizedField).regex(escapedPrefix));
            } else {
                filters.add(Criteria.where(normalizedField).regex("^" + escapedPrefix));
            }
        }

        List<AggregationOperation> pipeline = new ArrayList<>();
        if (!filters.isEmpty()) {
            pipeline.add(Aggregation.match(new Criteria().andOperator(filters.toArray(new Criteria[0]))));
        }

        // Group directly by the field - use $-prefixed field reference for nested paths
        // This handles both "fieldpath" and "metadata.productcode" correctly
        pipeline.add(Aggregation.group("$" + normalizedField));

        // For fieldPath, calculate depth (slash count) for sorting
        if (isFieldPath) {
            pipeline.add(Aggregation.project()
                .and("_id").as("value")
                .and(context -> new Document("$subtract", Arrays.asList(
                    new Document("$strLenCP", "$_id"),
                    new Document("$strLenCP", new Document("$replaceAll", new Document("input", "$_id").append("find", "/").append("replacement", "")))
                ))).as("depth")
            );
            // Sort by depth ASC, then value ASC
            pipeline.add(Aggregation.sort(Sort.Direction.ASC, "depth"));
            pipeline.add(Aggregation.sort(Sort.Direction.ASC, "value"));
        } else {
            // For metadata, sort by value ASC
            pipeline.add(Aggregation.sort(Sort.Direction.ASC, "_id"));
        }

        pipeline.add(Aggregation.limit(limit));

        AggregationResults<Document> results = mongoTemplate.aggregate(
            Aggregation.newAggregation(pipeline),
            "catalog_fields",
            Document.class
        );

        return results.getMappedResults().stream()
            .map(doc -> {
                Object val = isFieldPath ? doc.get("value") : doc.get("_id");
                return val != null ? val.toString() : null;
            })
            .filter(val -> val != null && !val.trim().isEmpty())
            .collect(Collectors.toList());
    }

    @Override
    public List<String> discoverySuggest(String searchTerm, String contextId, Map<String, String> metadata, Set<String> activeContextIds, int limit) {
        String searchPattern = escapeRegex(searchTerm.toLowerCase());

        // Build the discovery match conditions (OR across all fields)
        // See executeGlobalSearch() for detailed explanation of $objectToArray/$anyElementTrue operators
        Document discoveryConditions = new Document("$or", Arrays.asList(
            new Document("fieldpath", new Document("$regex", searchPattern)),
            new Document("contextid", new Document("$regex", searchPattern)),
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

        List<Criteria> andFilters = new ArrayList<>();
        
        // Add scope filters (context/metadata) - these are ANDed with the discovery OR
        if (contextId != null && !contextId.trim().isEmpty()) {
            if (activeContextIds != null && !activeContextIds.contains(contextId)) {
                return List.of();
            }
            andFilters.add(Criteria.where("contextid").is(contextId));
        } else if (activeContextIds != null && !activeContextIds.isEmpty()) {
            andFilters.add(Criteria.where("contextid").in(activeContextIds));
        }

        if (metadata != null && !metadata.isEmpty()) {
            for (Map.Entry<String, String> entry : metadata.entrySet()) {
                if (entry.getValue() != null && !entry.getValue().trim().isEmpty()) {
                    andFilters.add(Criteria.where("metadata." + entry.getKey()).is(entry.getValue()));
                }
            }
        }

        // Combine discovery conditions with scoped filters
        Document matchStage;
        if (!andFilters.isEmpty()) {
            Document scopedFilters = new Query().addCriteria(new Criteria().andOperator(andFilters.toArray(new Criteria[0]))).getQueryObject();
            matchStage = new Document("$match", new Document("$and", Arrays.asList(
                discoveryConditions,
                scopedFilters
            )));
        } else {
            matchStage = new Document("$match", discoveryConditions);
        }

        // Aggregation pipeline: Match -> Project fieldPath -> Group (distinct) -> Sort by latest seen -> Limit
        List<AggregationOperation> pipeline = new ArrayList<>();
        pipeline.add(context -> matchStage);
        pipeline.add(Aggregation.project("fieldpath", "lastobservedat"));
        pipeline.add(Aggregation.group("fieldpath").max("lastobservedat").as("latestSeen"));
        pipeline.add(Aggregation.sort(Sort.Direction.DESC, "latestSeen"));
        pipeline.add(Aggregation.limit(limit));

        AggregationResults<Document> results = mongoTemplate.aggregate(
            Aggregation.newAggregation(pipeline),
            "catalog_fields",
            Document.class
        );

        return results.getMappedResults().stream()
            .map(doc -> doc.getString("_id"))
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

    @Override
    public Map<String, Long> countGroupedByContextId() {
        // Use aggregation to get all counts in a single query
        // Pipeline: $group by contextId with $sum for count
        List<AggregationOperation> pipeline = new ArrayList<>();
        pipeline.add(Aggregation.group("contextid").count().as("count"));

        AggregationResults<Document> results = mongoTemplate.aggregate(
            Aggregation.newAggregation(pipeline),
            "catalog_fields",
            Document.class
        );

        // Convert results to Map<contextId, count>
        Map<String, Long> counts = new java.util.HashMap<>();
        for (Document doc : results.getMappedResults()) {
            String contextId = doc.getString("_id");
            // MongoDB returns Integer for count, need to convert to Long
            Number count = doc.get("count", Number.class);
            if (contextId != null && count != null) {
                counts.put(contextId, count.longValue());
            }
        }
        return counts;
    }
}