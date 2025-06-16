package com.ceremony.catalog.persistence;

import com.ceremony.catalog.domain.Context;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContextRepository extends MongoRepository<Context, String> {
    List<Context> findByActiveTrue();
}