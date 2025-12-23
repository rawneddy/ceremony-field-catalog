# Release 00: Backend API Foundation

**Completed:** Prior to December 2025
**Scope:** Spring Boot API, MongoDB persistence, core domain model, testing infrastructure

---

## What This Release Delivered

The backend foundation for the Ceremony Field Catalog - a Spring Boot API with MongoDB persistence that captures and queries XML field observations across dynamic business contexts.

### Core Capabilities

| Capability | Description |
|------------|-------------|
| Context Management | CRUD for business domain definitions with metadata schemas |
| Observation Ingestion | Accept field observations and merge into catalog entries |
| Field Search | Dynamic querying by context, metadata, and field path patterns |
| Autocomplete | Suggestions for field paths and metadata values |

---

## Why This Exists

Legacy middleware systems pass XML through without understanding field structure. This API provides:

1. **Observation endpoint** - SDKs report field usage from production traffic
2. **Merge logic** - Accumulates min/max/null/empty statistics over time
3. **Search API** - Query the accumulated knowledge
4. **Context system** - Organize observations by business domain

The API is designed for **fire-and-forget** observation submission - SDKs never block on API responses, and failures are silently logged rather than propagated.

---

## Core Patterns Established

### 1. Immutable DTOs with Records

All API data transfer objects use Java Records for immutability:

```java
public record CatalogSearchRequest(
    String q,
    String contextId,
    String fieldPathContains,
    Map<String, List<String>> metadata,
    int page,
    int size
) {}
```

**Why Records:** Immutable by default, no boilerplate, clear API contracts, natural fit for request/response objects.

### 2. Centralized Error Handling

`GlobalExceptionHandler` provides consistent error responses across all endpoints:

| Exception Type | HTTP Status | Use Case |
|----------------|-------------|----------|
| `MethodArgumentNotValidException` | 400 | Bean validation failures |
| `ConstraintViolationException` | 400 | Constraint violations |
| `MethodArgumentTypeMismatchException` | 400 | Type conversion errors |
| `HttpMessageNotReadableException` | 400 | Malformed JSON |
| `DataAccessException` | 500 | Database errors |

All errors return structured `ErrorResponse` with timestamp, status, message, and path.

### 3. Input Validation Service

`InputValidationService` validates and normalizes all input before processing:

- **Field paths**: Format validation, length limits, control character removal
- **Metadata**: Key/value format validation, length limits, lowercase normalization
- **Context IDs**: Format and length validation

**Key principle:** Validation happens once at the service layer entry point, not scattered throughout the codebase.

### 4. Dynamic Search Parameters

`DynamicSearchParameterResolver` converts any query parameter prefixed with `metadata.` into search criteria:

```
GET /catalog/fields?metadata.productCode=DDA&metadata.action=fulfillment
```

**Why this matters:** New metadata fields don't require API changes. The resolver dynamically builds the filter map.

### 5. Configuration as Code

`CatalogProperties` centralizes all configuration with validation:

```java
@ConfigurationProperties(prefix = "app.catalog")
public record CatalogProperties(
    ValidationProperties validation,
    PerformanceProperties performance,
    CacheProperties cache
) {}
```

- Environment-specific profiles: `dev`, `test`, `prod`
- Startup validation via `ConfigurationValidator`
- Configuration summary logged on startup

---

## Performance Optimizations

### Database Query Optimization

The `handleSingleContextCleanup` operation (setting minOccurs=0 for absent fields) was optimized from O(n) full-document queries to targeted projections:

| Dataset Size | Before | After | Improvement |
|--------------|--------|-------|-------------|
| 100 entries | ~100ms | 5ms | 95% faster |
| 1,000 entries | ~500ms | 9ms | 98% faster |
| 5,000 entries | ~2000ms | 13ms | 99% faster |

**How:**
- Added `findXpathsByContextAndMetadata()` with field projection (returns only XPaths, not full documents)
- Created compound index `idx_context_metadata_xpath_optimized`
- Memory usage reduced 80% through projection queries

### Query Performance Monitoring

`QueryPerformanceAspect` logs slow queries with configurable threshold:

```yaml
app:
  catalog:
    performance:
      slow-query-threshold-ms: 100
```

Queries exceeding threshold are logged with execution time for monitoring.

---

## Testing Infrastructure

### Base Classes

| Base Class | Purpose |
|------------|---------|
| `IntegrationTestBase` | Testcontainers MongoDB setup, container reuse |
| `ServiceTestBase` | Service layer testing with real MongoDB |
| `UnitTestBase` | Isolated unit testing with mocking patterns |
| `PerformanceTestBase` | Benchmark testing and performance validation |

### Test Utilities

- **`TestDataBuilder`** - Fluent builders for all domain objects
- **`TestAssertions`** - Domain-specific assertion helpers
- **`@TestProfile`** - Consistent test configuration annotation

**Result:** 30% faster test execution through container reuse, zero code duplication across tests.

---

## API Documentation

OpenAPI 3 documentation via springdoc-openapi:

- Swagger UI at `/swagger-ui/index.html`
- OpenAPI spec at `/v3/api-docs`
- All endpoints annotated with descriptions, examples, response schemas
- Endpoints organized by tags: Field Catalog, Context Management

---

## Key Files for Understanding the Implementation

| Purpose | Location |
|---------|----------|
| Domain models | `src/main/java/com/ceremony/catalog/domain/` |
| API controllers | `src/main/java/com/ceremony/catalog/api/` |
| Core services | `src/main/java/com/ceremony/catalog/service/` |
| Custom queries | `src/main/java/com/ceremony/catalog/persistence/CatalogCustomRepositoryImpl.java` |
| Configuration | `src/main/java/com/ceremony/catalog/config/CatalogProperties.java` |
| Error handling | `src/main/java/com/ceremony/catalog/api/GlobalExceptionHandler.java` |
| Input validation | `src/main/java/com/ceremony/catalog/service/InputValidationService.java` |
| Test base classes | `src/test/java/com/ceremony/catalog/base/` |

---

## Domain Model

### Context

Defines a business domain with its metadata schema:

```java
public class Context {
    String contextId;           // e.g., "deposits"
    String displayName;         // e.g., "Deposit Processing"
    List<String> requiredMetadata;  // Keys that affect field identity
    List<String> optionalMetadata;  // Keys stored but don't affect identity
    Map<String, MetadataExtractionRule> metadataRules;  // Auto-extraction config
    boolean active;             // Whether accepting observations
}
```

### CatalogEntry

A field observed within a context:

```java
public class CatalogEntry {
    String id;                  // hash(contextId + requiredMetadata + fieldPath)
    String contextId;
    Map<String, String> metadata;
    String fieldPath;           // e.g., "/Ceremony/Account/Amount"
    int minOccurs;
    int maxOccurs;
    boolean allowsNull;
    boolean allowsEmpty;
    Instant firstObservedAt;
    Instant lastObservedAt;
}
```

### FieldKey

Computes deterministic field identity:

```java
public class FieldKey {
    public static String generate(String contextId, Map<String, String> requiredMetadata, String fieldPath) {
        // Returns hash-based ID like "field_a1b2c3d4"
    }
}
```

---

## Anti-Patterns Avoided

| Anti-Pattern | How We Avoid It |
|--------------|-----------------|
| Mixing Lombok and Records | All DTOs are Records, domain objects use Lombok |
| Scattered validation | All validation in `InputValidationService` |
| Raw MongoDB queries | Always use `CatalogCustomRepository` criteria builders |
| Direct repository access | Services mediate all data access |
| Unvalidated input in business logic | Validation at service entry points |

---

## What Was Deferred

- **Actuator/metrics** - Health checks and Prometheus metrics (see backlog)
- **ArchUnit tests** - Architectural enforcement via static analysis
- **Request/response logging** - Structured logging for observability

---

## Summary

Release 00 established the backend foundation:

1. **Clean API** with dynamic search parameters and consistent error handling
2. **Performance-optimized** MongoDB queries (95%+ faster)
3. **Validated input** at service boundaries
4. **Testable architecture** with base classes and builders
5. **Configurable** via environment-specific profiles

This foundation enabled Release 01 (the UI) to focus purely on user experience, knowing the API layer was solid.
