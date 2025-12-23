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
    String id;                    // hash(contextId + requiredMetadata + fieldPath)
    String contextId;             // Parent context
    String fieldPath;             // XPath location
    Map<String, String> metadata; // All metadata (required + optional)
    int minOccurs;                // Minimum occurrences observed
    int maxOccurs;                // Maximum occurrences observed
    boolean allowsNull;           // Has xsi:nil="true" been observed
    boolean allowsEmpty;          // Has empty string been observed
    Instant firstObservedAt;      // First observation timestamp
    Instant lastObservedAt;       // Last observation timestamp
}
```

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
| Metadata | `metadata.$**` | Wildcard for metadata queries |

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
GET  /catalog/fields              # Search fields
GET  /catalog/fields/{id}         # Get by ID
GET  /catalog/suggest             # Autocomplete
POST /catalog/contexts/{id}/observations  # Submit observations
```

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
