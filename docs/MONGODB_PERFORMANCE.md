# MongoDB Performance Strategy

## Document Purpose

This document provides a comprehensive indexing and performance strategy for the Ceremony Field Catalog at production scale. It addresses the gap between current implementation and the requirements for handling millions of observation sets per month.

---

## Data Model: Aggregated Schema Storage

**Critical insight:** The catalog stores **aggregated schema-level data**, not raw observations. When observations are submitted, the `CatalogService.merge()` method either updates an existing document or creates a new one based on field identity.

### Field Identity and Merge Logic

```java
// Field identity = hash(contextId + requiredMetadata + fieldPath)
FieldKey fieldKey = new FieldKey(contextId, requiredMetadata, fieldPath);

CatalogEntry entry = existingEntries.get(fieldKey.toString());
if (entry != null) {
    // UPDATE existing document - no new document created
    entry.setMaxOccurs(Math.max(entry.getMaxOccurs(), dto.count()));
    entry.setMinOccurs(Math.min(entry.getMinOccurs(), dto.count()));
    entry.setAllowsNull(entry.isAllowsNull() || dto.hasNull());
    entry.setAllowsEmpty(entry.isAllowsEmpty() || dto.hasEmpty());
} else {
    // CREATE new document only for new field+metadata combination
    CatalogEntry newEntry = CatalogEntry.builder()...
}
```

**What each document stores:**
- `maxOccurs` — highest count seen across all observations
- `minOccurs` — lowest count seen (tracks optional vs required)
- `allowsNull` — OR'd across all observations
- `allowsEmpty` — OR'd across all observations
- `firstObservedAt` / `lastObservedAt` — temporal bounds

### Document Count Formula

```
Total Documents = Σ (unique fieldPaths × unique requiredMetadata combinations) per context
```

**Example:** If you submit 10 million observations/month but they represent:
- 3 contexts
- ~100 unique required metadata combinations per context
- ~2,000 unique field paths per combination

Total documents: `3 × 100 × 2,000 = 600,000` — not 10 million.

---

## Scale Requirements

| Metric | Volume |
|--------|--------|
| Observation sets per month | Millions |
| Observations per set | 20-400 |
| Unique contexts | 10-50 |
| Unique metadata combinations per context | 50-500 |
| Unique field paths per combination | 500-5,000 |
| **Estimated document count** | 250K - 5M |
| Target query response time | < 500ms for filtered searches |

Because the system aggregates observations rather than storing them individually, the document count grows with **schema complexity**, not observation volume. This makes the scale requirements much more manageable—but proper indexing is still essential for metadata filtering and global search performance.

---

## Current State Analysis

### Existing Indexes

```java
// CatalogCustomRepositoryImpl.java - createIndexes()

// 1. Context + field path compound
indexOps.ensureIndex(new Index()
    .on("contextid", Sort.Direction.ASC)
    .on("fieldpath", Sort.Direction.ASC));

// 2. Field path alone
indexOps.ensureIndex(new Index()
    .on("fieldpath", Sort.Direction.ASC));

// 3. Context + metadata (PROBLEMATIC)
indexOps.ensureIndex(new Index()
    .on("contextid", Sort.Direction.ASC)
    .on("metadata", Sort.Direction.ASC)
    .named("idx_context_metadata_fieldpath_optimized"));
```

### Problems with Current Approach

| Issue | Impact |
|-------|--------|
| **Index #3 indexes `metadata` as whole object** | Queries like `metadata.productcode=dda` cannot use this index—MongoDB requires dot-notation path to match index definition |
| **No support for dynamic metadata keys** | Each context defines different metadata keys (productcode, action, channel, loantype, etc.)—no indexes cover these |
| **Global search uses `$objectToArray`** | Aggregation operator that iterates all metadata keys is inherently unindexed |
| **Suggestion queries on `metadata.{key}`** | Distinct value queries for autocomplete perform collection scans |

### Query Pattern Analysis

| Query Type | Current Index Support | Collection Scan Risk |
|------------|----------------------|---------------------|
| `contextId=X` | ✅ Covered | None |
| `fieldPath` contains pattern | ✅ Covered | None |
| `contextId + fieldPath` | ✅ Covered | None |
| `metadata.productcode=dda` | ❌ None | **Full scan on metadata** |
| `metadata.productcode IN [dda, sav]` | ❌ None | **Full scan on metadata** |
| Global search (`q` parameter) | ❌ None | **Full collection scan** |
| Suggestions for `metadata.{key}` | ❌ None | **Full scan + distinct** |

Even at 1-5M documents, an unindexed query on metadata can take **seconds** instead of milliseconds—and as metadata cardinality grows, this compounds quickly.

---

## Recommended Indexing Strategy

### Tier 1: Wildcard Index on Metadata (Immediate)

Add a wildcard index to cover all dynamic metadata key queries:

```java
// Add to CatalogCustomRepositoryImpl.createIndexes()
indexOps.ensureIndex(new WildcardIndex("metadata"));
```

Or via MongoDB shell:
```javascript
db.catalog_fields.createIndex({ "metadata.$**": 1 })
```

**What this covers:**
```javascript
// All of these queries now use the wildcard index:
{ "metadata.productcode": "dda" }
{ "metadata.action": { $in: ["fulfillment", "inquiry"] } }
{ "metadata.channel": "online" }
{ "metadata.loantype": { $regex: "^fixed" } }
```

**Characteristics:**

| Aspect | Detail |
|--------|--------|
| Index size | Proportional to unique metadata key-value combinations |
| Write overhead | Moderate—each document insert indexes all metadata k/v pairs |
| Query coverage | Excellent for single metadata key queries |
| Limitation | Only one field per query can use wildcard index |

**Why wildcard over explicit indexes:**
- Metadata keys are dynamic (defined per context, not hardcoded)
- Creating explicit indexes for every possible key is unmaintainable
- Wildcard automatically covers new keys as contexts are created

### Tier 2: Optimized Compound Indexes

Add compound indexes for the most common access patterns:

```java
// High-frequency pattern: Context + metadata + fieldpath
// For filtered searches within a context
indexOps.ensureIndex(new Index()
    .on("contextid", Sort.Direction.ASC)
    .on("fieldpath", Sort.Direction.ASC)
    .on("lastupdatedat", Sort.Direction.DESC)
    .named("idx_context_fieldpath_recent"));

// For time-based queries and cleanup
indexOps.ensureIndex(new Index()
    .on("lastupdatedat", Sort.Direction.DESC)
    .named("idx_recent_observations"));
```

**Index selection principle:** MongoDB uses the leftmost prefix of compound indexes. Design indexes so the most selective field is first.

### Tier 3: Remove Ineffective Index

Remove or replace the current metadata-as-object index:

```java
// REMOVE THIS - it doesn't help dot-notation queries:
indexOps.ensureIndex(new Index()
    .on("contextid", Sort.Direction.ASC)
    .on("metadata", Sort.Direction.ASC)  // Indexes whole object, useless for metadata.key queries
    .named("idx_context_metadata_fieldpath_optimized"));
```

This index consumes storage and write overhead without benefiting any actual query pattern.

---

## Global Search Optimization

The global search (`?q=term`) currently uses `$objectToArray` to search across metadata values:

```java
// Current approach in CatalogCustomRepositoryImpl
Aggregation.project()
    .and(ObjectOperators.valueOf("metadata").toArray()).as("metadataArray")
// Then $match on metadataArray.v
```

**Problem:** `$objectToArray` is a runtime operation—it cannot use indexes.

### Solution A: Materialized Search Field

Add a denormalized field containing all searchable text:

```java
// During merge/insert, compute:
String searchText = String.join(" ",
    entry.getContextId(),
    entry.getFieldPath(),
    entry.getMetadata().values()  // All metadata values
).toLowerCase();
entry.setSearchText(searchText);
```

Index with text index:
```javascript
db.catalog_fields.createIndex({ "searchText": "text" })
```

Query:
```javascript
db.catalog_fields.find({ $text: { $search: "dda ceremony account" } })
```

**Trade-offs:**

| Aspect | Detail |
|--------|--------|
| Pros | Fast text search, relevance scoring, supports phrases |
| Cons | Must maintain searchText on every update, storage overhead |
| Maintenance | Update searchText in CatalogService.merge() |

### Solution B: Atlas Search (If Using MongoDB Atlas)

MongoDB Atlas provides a dedicated search engine with:
- Full-text search with fuzzy matching
- Autocomplete support
- Faceted search
- No $objectToArray needed

```javascript
// Atlas Search index definition
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "fieldpath": { "type": "string", "analyzer": "lucene.keyword" },
      "contextid": { "type": "string" },
      "metadata": { "type": "document", "dynamic": true }
    }
  }
}
```

**Recommendation:** If using Atlas, prefer Atlas Search for global discovery. It's purpose-built for this use case.

### Solution C: Accept Limitations for POC

For initial deployment, accept that global search is slower:
- Limit global search to users who need it
- Encourage context-scoped searches (which are indexed)
- Add UI guidance: "Select a context for faster results"

---

## Suggestion Query Optimization

Autocomplete suggestions currently aggregate distinct values:

```java
// Current approach
Aggregation.group("$" + normalizedField)  // e.g., "$metadata.productcode"
```

**With wildcard index**, this query improves significantly because the distinct scan uses the index.

**Further optimization** via covered query:

```javascript
// If we only need values, not full documents:
db.catalog_fields.distinct("metadata.productcode", { contextid: "deposits" })
```

With the wildcard index, this is an index-only operation—no document fetches.

---

## Write Performance Considerations

While document volume is moderate (thousands to millions, not billions), write performance still matters because the merge operation touches indexes on every update.

### Index Overhead Per Write

| Index Type | Overhead |
|------------|----------|
| Single field | Low |
| Compound (2-3 fields) | Low-Medium |
| Wildcard on metadata | Medium-High (indexes every k/v pair) |
| Text index | High |

### Batch Write Strategy

The current merge logic already batches:
```java
catalogRepository.saveAll(toSave);
```

**Recommendation:** Continue batching. Consider:
- Batch sizes of 100-500 documents
- Unordered bulk writes for parallelism
- Write concern `w:1` for throughput (if durability allows)

### Index Build Timing

For existing collections, build indexes in background:
```javascript
db.catalog_fields.createIndex({ "metadata.$**": 1 }, { background: true })
```

For new deployments, indexes are created at startup via `@PostConstruct`.

---

## Sharding Considerations (Future)

Sharding is unlikely to be necessary given the aggregated data model. However, if the catalog grows to tens of millions of documents (many contexts with high metadata cardinality), consider sharding.

**Recommended shard key:** `contextId`

```javascript
sh.shardCollection("ceremony_catalog.catalog_fields", { "contextid": "hashed" })
```

**Why contextId:**
- Most queries filter by context first
- Even distribution if contexts have similar volumes
- Enables context-isolated queries to hit single shard

**Alternative:** `contextId + fieldPath` compound shard key for more granular distribution.

---

## Implementation Checklist

### Immediate (Before Production)

- [ ] Add wildcard index on metadata: `{ "metadata.$**": 1 }`
- [ ] Remove ineffective index: `idx_context_metadata_fieldpath_optimized`
- [ ] Add recency index: `{ "lastupdatedat": -1 }`
- [ ] Verify index usage with `explain()` on common queries

### Short-Term (First Month)

- [ ] Implement materialized `searchText` field for global search
- [ ] Add text index on `searchText`
- [ ] Update `CatalogService.merge()` to compute `searchText`
- [ ] Monitor index sizes and query performance

### Medium-Term (Scale Phase)

- [ ] Evaluate Atlas Search if on MongoDB Atlas
- [ ] Implement index usage monitoring/alerting
- [ ] Profile and optimize suggestion queries
- [ ] Consider sharding only if approaching tens of millions of documents

---

## Code Changes Required

### 1. Update CatalogCustomRepositoryImpl.java

```java
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

    // Wildcard index for dynamic metadata key queries
    indexOps.ensureIndex(new WildcardIndex("metadata"));

    // Recency index for time-based queries
    indexOps.ensureIndex(new Index()
        .on("lastupdatedat", Sort.Direction.DESC)
        .named("idx_recent"));

    // REMOVED: idx_context_metadata_fieldpath_optimized (ineffective)
}
```

### 2. Add SearchText Field (Optional Enhancement)

```java
// In CatalogEntry.java
@Field("searchtext")
private String searchText;

// In CatalogService.merge()
private String computeSearchText(CatalogEntry entry) {
    StringBuilder sb = new StringBuilder();
    sb.append(entry.getContextId()).append(" ");
    sb.append(entry.getFieldPath()).append(" ");
    entry.getMetadata().values().forEach(v -> sb.append(v).append(" "));
    return sb.toString().toLowerCase().trim();
}
```

---

## Monitoring Queries

### Check Index Usage

```javascript
// Explain a query to verify index usage
db.catalog_fields.find({
  "contextid": "deposits",
  "metadata.productcode": "dda"
}).explain("executionStats")

// Look for:
// - "stage": "IXSCAN" (good) vs "COLLSCAN" (bad)
// - "totalDocsExamined" should be close to "nReturned"
```

### Index Statistics

```javascript
// View all indexes and sizes
db.catalog_fields.stats().indexSizes

// View index usage statistics
db.catalog_fields.aggregate([{ $indexStats: {} }])
```

### Slow Query Log

```javascript
// Enable profiling for slow queries (>100ms)
db.setProfilingLevel(1, { slowms: 100 })

// View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10)
```

---

## Summary

| Current State | Recommendation | Impact |
|---------------|----------------|--------|
| No index on `metadata.{key}` | Add wildcard index `metadata.$**` | 100x+ faster metadata filters |
| Ineffective whole-object metadata index | Remove it | Reduce storage, write overhead |
| Unindexed global search | Add materialized searchText + text index | 10x+ faster global discovery |
| No recency index | Add `lastupdatedat` index | Faster time-based queries |

**Priority order:**
1. Wildcard index (immediate, biggest impact)
2. Remove ineffective index (housekeeping)
3. Materialized searchText (when global search performance becomes issue)
4. Sharding evaluation (unlikely to be needed given aggregated data model)

The wildcard index alone will transform metadata query performance from collection scans to indexed lookups. While the aggregated data model keeps document volume moderate, the dynamic nature of metadata keys still requires proper indexing for responsive filtering and search.
