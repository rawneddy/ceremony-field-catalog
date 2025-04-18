package com.ceremony.catalog.persistence;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.PartialIndexFilter;
import org.springframework.stereotype.Repository;

import javax.annotation.PostConstruct;
import org.springframework.data.domain.Sort;
import org.bson.Document;

import com.ceremony.catalog.api.dto.CatalogSearchCriteria;
import com.ceremony.catalog.domain.CatalogEntry;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Repository
public class CatalogCustomRepositoryImpl implements CatalogCustomRepository {

    @Autowired
    private MongoTemplate mongoTemplate;

    @PostConstruct
    private void initIndexes() {
        var indexOps = mongoTemplate.indexOps(CatalogEntry.class);
        indexOps.ensureIndex(new Index()
            .on("pathType", Sort.Direction.ASC)
            .on("formCode", Sort.Direction.ASC)
            .on("formVersion", Sort.Direction.ASC));
        Document depositsFilter = new Document("$or", Arrays.asList(
            new Document("action", new Document("$exists", true)),
            new Document("productCode", new Document("$exists", true)),
            new Document("productSubCode", new Document("$exists", true))
        ));
        indexOps.ensureIndex(new Index()
            .on("action", Sort.Direction.ASC)
            .on("productCode", Sort.Direction.ASC)
            .on("productSubCode", Sort.Direction.ASC)
            .on("pathType", Sort.Direction.ASC)
            .on("formCode", Sort.Direction.ASC)
            .on("formVersion", Sort.Direction.ASC)
            .partial(PartialIndexFilter.of(depositsFilter)));
        indexOps.ensureIndex(new Index()
            .on("loanProductCode", Sort.Direction.ASC)
            .on("pathType", Sort.Direction.ASC)
            .on("formCode", Sort.Direction.ASC)
            .on("formVersion", Sort.Direction.ASC)
            .partial(PartialIndexFilter.of(new Document("loanProductCode", new Document("$exists", true)))));
    }

    @Override
    public List<CatalogEntry> searchByCriteria(CatalogSearchCriteria criteriaDto) {
        return searchByCriteria(criteriaDto, Pageable.unpaged()).getContent();
    }

    @Override
    public Page<CatalogEntry> searchByCriteria(CatalogSearchCriteria criteriaDto, Pageable pageable) {
        List<Criteria> filters = new ArrayList<>();
        Optional.ofNullable(criteriaDto.pathType()).ifPresent(v -> filters.add(Criteria.where("pathType").is(v)));
        Optional.ofNullable(criteriaDto.formCode()).ifPresent(v -> filters.add(Criteria.where("formCode").is(v)));
        Optional.ofNullable(criteriaDto.formVersion()).ifPresent(v -> filters.add(Criteria.where("formVersion").is(v)));
        Optional.ofNullable(criteriaDto.action()).ifPresent(v -> filters.add(Criteria.where("action").is(v)));
        Optional.ofNullable(criteriaDto.productCode()).ifPresent(v -> filters.add(Criteria.where("productCode").is(v)));
        Optional.ofNullable(criteriaDto.productSubCode()).ifPresent(v -> filters.add(Criteria.where("productSubCode").is(v)));
        Optional.ofNullable(criteriaDto.loanProductCode()).ifPresent(v -> filters.add(Criteria.where("loanProductCode").is(v)));
        Optional.ofNullable(criteriaDto.xpathContains()).ifPresent(v -> filters.add(Criteria.where("xpath").regex(v, "i")));
        Query query = new Query();
        if (!filters.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(filters.toArray(new Criteria[0])));
        }
        long total = mongoTemplate.count(query, CatalogEntry.class);
        List<CatalogEntry> entries = mongoTemplate.find(query.with(pageable), CatalogEntry.class);
        return new PageImpl<>(entries, pageable, total);
    }
}
