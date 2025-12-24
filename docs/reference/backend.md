# Backend Reference

**Purpose:** Deep architecture reference for backend development
**Use when:** Major refactoring, understanding system internals, onboarding
**See also:** How-to docs for specific tasks

---

## Package Structure

```
src/main/java/com/ceremony/catalog/
├── api/              # REST controllers and DTOs
│   ├── CatalogController.java
│   ├── ContextController.java
│   └── dto/
├── service/          # Business logic
│   ├── CatalogService.java
│   └── ContextService.java
├── domain/           # Domain models
│   ├── CatalogEntry.java
│   ├── Context.java
│   ├── FieldKey.java
│   └── ContextKey.java
├── persistence/      # MongoDB repositories
│   ├── CatalogRepository.java
│   ├── ContextRepository.java
│   └── CatalogCustomRepositoryImpl.java
└── config/           # Configuration classes
    ├── CatalogProperties.java
    └── MongoConfig.java
```

---

## Domain Models

### CatalogEntry

Primary document stored in `catalog_fields` collection:

```java
@Document("catalog_fields")
public class CatalogEntry {
    String id;                              // hash(contextId + requiredMetadata + fieldPath)
    String contextId;                       // Parent context
    String fieldPath;                       // XPath location (lowercase for identity)
    Map<String, String> requiredMetadata;   // Immutable, part of field identity
    Map<String, Set<String>> optionalMetadata; // Accumulated set of all observed values
    Map<String, Long> casingCounts;         // Original casings with observation counts
    String canonicalCasing;                 // User-selected casing for export (nullable)
    int minOccurs;                          // Minimum occurrences observed
    int maxOccurs;                          // Maximum occurrences observed
    boolean allowsNull;                     // Has xsi:nil="true" been observed
    boolean allowsEmpty;                    // Has empty string been observed
    Instant firstObservedAt;                // First observation timestamp
    Instant lastObservedAt;                 // Last observation timestamp
}
```

**Metadata behavior:**
- **Required metadata** is single-valued and immutable after creation. It contributes to field identity.
- **Optional metadata** accumulates all values ever observed as a Set per key. When a new observation arrives with a value for an optional metadata key, that value is added to the set (not replaced). Note: While TreeSet is used in-memory (alphabetical order), MongoDB stores arrays and deserializes to HashSet, so value order is not guaranteed after storage.

**Casing tracking:**
- `fieldPath` is stored lowercase for identity and search consistency.
- `casingCounts` tracks original casings as they appear in source documents, with observation counts.
- `canonicalCasing` is the user-selected authoritative casing for schema export. If null, export uses the most-observed casing.

### Context

Document in `contexts` collection:

```java
@Document("contexts")
public class Context {
    String contextId;             // Unique ID (lowercase)
    String displayName;           // Display name
    String description;           // Optional
    List<String> requiredMetadata;// Part of field identity
    List<String> optionalMetadata;// Stored but not identity
    Map<String, String> metadataRules; // XPath extraction
    boolean active;               // Visibility flag
}
```

### FieldKey

Computes field identity:

```java
public class FieldKey {
    // Identity = hash(contextId + requiredMetadata + fieldPath)
    public static String computeId(String contextId,
                                    Map<String, String> requiredMetadata,
                                    String fieldPath)
}
```

---

## MongoDB Collections

### catalog_fields

| Index | Fields | Purpose |
|-------|--------|---------|
| Primary | `_id` | Field identity hash |
| Context lookup | `contextId` | Filter by context |
| Path search | `fieldPath` | Path queries |
| Required metadata | `requiredmetadata.$**` | Wildcard for required metadata queries |
| Optional metadata | `optionalmetadata.$**` | Wildcard for optional metadata filtering |

### contexts

| Index | Fields | Purpose |
|-------|--------|---------|
| Primary | `contextId` | Unique context lookup |

---

## Service Layer

### CatalogService

Core operations:
- `submitObservations()` - Process observation batch
- `mergeObservation()` - Merge into existing entry
- `markAbsentFieldsAsOptional()` - Single-context cleanup
- `search()` - Dynamic field search

### ContextService

Context lifecycle:
- `createContext()` - Create with validation
- `updateContext()` - Update (respects immutability)
- `deleteContext()` - Delete context and entries
- `getAllContextsWithCounts()` - List with field counts

---

## API Layer

### CatalogController

```
GET  /catalog/fields                        # Search fields
GET  /catalog/fields/{id}                   # Get by ID (404 if not found)
PUT  /catalog/fields/{id}/canonical-casing  # Set canonical casing for export
GET  /catalog/suggest                       # Autocomplete with cascading filters
POST /catalog/contexts/{id}/observations    # Submit observations
```

**Cascading filters:** The suggest endpoint accepts `metadata.<key>=<value>` query params
to narrow suggestions based on already-selected metadata values.

### ContextController

```
GET    /catalog/contexts          # List contexts
POST   /catalog/contexts          # Create context
GET    /catalog/contexts/{id}     # Get context
PUT    /catalog/contexts/{id}     # Update context
DELETE /catalog/contexts/{id}     # Delete context
```

---

## Configuration

### application.yml

```yaml
spring:
  data:
    mongodb:
      uri: ${MONGODB_URI:mongodb://localhost:27017/ceremony_catalog}

catalog:
  max-field-path-length: 500
  max-metadata-key-length: 100
  max-metadata-value-length: 500
```

### CatalogProperties

```java
@ConfigurationProperties(prefix = "catalog")
public class CatalogProperties {
    private int maxFieldPathLength = 500;
    private int maxMetadataKeyLength = 100;
    private int maxMetadataValueLength = 500;
}
```

---

## Key Patterns

### Lombok Usage

All domain and DTO classes use Lombok:
- `@Data` - getters/setters/equals/hashCode
- `@Builder` - builder pattern
- `@RequiredArgsConstructor` - constructor injection

### Repository Pattern

- Standard: `CatalogRepository extends MongoRepository<CatalogEntry, String>`
- Custom: `CatalogCustomRepository` for dynamic queries
- Implementation: `CatalogCustomRepositoryImpl` uses `MongoTemplate`

### Error Handling

`GlobalExceptionHandler` catches and formats errors:
- Validation errors → 400 Bad Request
- Not found → 404 Not Found
- Server errors → 500 Internal Server Error
