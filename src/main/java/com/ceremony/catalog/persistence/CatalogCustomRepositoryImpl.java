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
public class CatalogCustomRepositoryImpl implements CatalogCustomRepository {

    private final MongoTemplate mongoTemplate;

    @PostConstruct
    private void createIndexes() {
        var indexOps = mongoTemplate.indexOps(CatalogEntry.class);
        
        // Primary index for context-based queries
        indexOps.ensureIndex(new Index()
            .on("contextId", Sort.Direction.ASC)
            .on("fieldPath", Sort.Direction.ASC));
            
        // Index for field path pattern searches
        indexOps.ensureIndex(new Index()
            .on("fieldPath", Sort.Direction.ASC));
            
        // Optimized compound index for findFieldPathsByContextAndMetadata queries
        // This supports efficient queries on contextId + metadata combinations
        indexOps.ensureIndex(new Index()
            .on("contextId", Sort.Direction.ASC)
            .on("metadata", Sort.Direction.ASC)
            .named("idx_context_metadata_fieldpath_optimized"));
            
        // Text index for field path search if needed (commented out as text indexes require special setup)
        // indexOps.ensureIndex(new Index().on("fieldPath", "text"));
    }

    @Override
    public List<CatalogEntry> searchByCriteria(CatalogSearchCriteria criteriaDto) {
        return searchByCriteria(criteriaDto, Pageable.unpaged()).getContent();
    }

    @Override
    public Page<CatalogEntry> searchByCriteria(CatalogSearchCriteria criteriaDto, Pageable pageable) {
        List<Criteria> filters = new ArrayList<>();
        
        // Filter by context if specified
        Optional.ofNullable(criteriaDto.contextId())
            .ifPresent(v -> filters.add(Criteria.where("contextId").is(v)));
        
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
        Optional.ofNullable(criteriaDto.fieldPathContains())
            .ifPresent(v -> filters.add(Criteria.where("fieldPath").regex(v, "i")));
        
        Query query = new Query();
        if (!filters.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(filters.toArray(new Criteria[0])));
        }
        
        // Apply sorting by field path by default
        if (pageable.getSort().isUnsorted()) {
            query.with(Sort.by(Sort.Direction.ASC, "fieldPath"));
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
            query.addCriteria(Criteria.where("contextId").is(contextId));
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
        
        // Project only fieldPath field for minimal data transfer
        query.fields().include("fieldPath");
        
        // Execute query and extract distinct field path values
        return mongoTemplate.find(query, CatalogEntry.class)
            .stream()
            .map(CatalogEntry::getFieldPath)
            .filter(fieldPath -> fieldPath != null && !fieldPath.trim().isEmpty())
            .distinct()
            .collect(Collectors.toList());
    }
}