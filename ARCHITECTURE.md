# Ceremony Field Catalog - Architecture Document

## System Context

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION ENVIRONMENT                                  │
│                                                                                      │
│  ┌─────────────────┐     ┌──────────────────────────┐     ┌───────────────────────┐ │
│  │  Upstream       │     │  Legacy Ceremony System  │     │  Adobe LiveCycle      │ │
│  │  Systems        │────►│  (.NET Framework)        │────►│  (PDF Rendering)      │ │
│  │                 │     │                          │     │                       │ │
│  └─────────────────┘     └────────────┬─────────────┘     └───────────────────────┘ │
│                                       │                                              │
│                                       │ Async Fire-and-Forget                        │
│                                       │ Field Observations                           │
│                                       ▼                                              │
│                          ┌────────────────────────────┐                              │
│                          │   Ceremony Field Catalog   │                              │
│                          │   (Spring Boot / MongoDB)  │                              │
│                          └────────────────────────────┘                              │
│                                       │                                              │
└───────────────────────────────────────┼──────────────────────────────────────────────┘
                                        │
                                        ▼
                    ┌───────────────────────────────────────┐
                    │           Consumers                    │
                    │  • Modernization Teams                │
                    │  • Business Analysts                  │
                    │  • Operations / Support               │
                    │  • Template Team                      │
                    │  • Future UI Dashboard                │
                    └───────────────────────────────────────┘
```

---

## Conceptual Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           CEREMONY FIELD CATALOG                                     │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              API LAYER                                          │ │
│  │  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  │ │
│  │  │  Context Controller  │  │  Catalog Controller  │  │  Dynamic Parameter   │  │ │
│  │  │  /catalog/contexts   │  │  /catalog/fields     │  │  Resolver            │  │ │
│  │  │  /catalog/contexts/* │  │  /catalog/contexts/  │  │  (any param →        │  │ │
│  │  │                      │  │   */observations     │  │   metadata filter)   │  │ │
│  │  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘  │ │
│  └─────────────────────────────────────┬──────────────────────────────────────────┘ │
│                                        │                                             │
│  ┌─────────────────────────────────────▼──────────────────────────────────────────┐ │
│  │                            SERVICE LAYER                                        │ │
│  │  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  │ │
│  │  │   Context Service    │  │   Catalog Service    │  │  Input Validation    │  │ │
│  │  │   • Create/Update    │  │   • Merge Logic      │  │  Service             │  │ │
│  │  │   • Schema Mgmt      │  │   • Search/Query     │  │  • Sanitization      │  │ │
│  │  │   • Lifecycle        │  │   • Stats Update     │  │  • Length Limits     │  │ │
│  │  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘  │ │
│  └─────────────────────────────────────┬──────────────────────────────────────────┘ │
│                                        │                                             │
│  ┌─────────────────────────────────────▼──────────────────────────────────────────┐ │
│  │                          PERSISTENCE LAYER                                      │ │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                            │ │
│  │  │  Context Repository  │  │  Catalog Repository  │                            │ │
│  │  │  (Spring Data)       │  │  + Custom Impl       │                            │ │
│  │  │                      │  │  (Dynamic Queries)   │                            │ │
│  │  └──────────────────────┘  └──────────────────────┘                            │ │
│  └─────────────────────────────────────┬──────────────────────────────────────────┘ │
│                                        │                                             │
│  ┌─────────────────────────────────────▼──────────────────────────────────────────┐ │
│  │                             DATA LAYER                                          │ │
│  │                                                                                  │ │
│  │                           ┌──────────────┐                                       │ │
│  │                           │   MongoDB    │                                       │ │
│  │                           │              │                                       │ │
│  │                           │  • contexts  │                                       │ │
│  │                           │  • catalog_  │                                       │ │
│  │                           │    fields    │                                       │ │
│  │                           └──────────────┘                                       │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### API Layer

#### Context Controller
Manages observation point definitions (contexts).

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/catalog/contexts` | POST | Create new context |
| `/catalog/contexts` | GET | List all contexts |
| `/catalog/contexts/{contextId}` | GET | Get specific context |
| `/catalog/contexts/{contextId}` | PUT | Update context (optional metadata only) |
| `/catalog/contexts/{contextId}` | DELETE | Deactivate context |

#### Catalog Controller
Handles field observations and searches.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/catalog/contexts/{contextId}/observations` | POST | Submit field observations |
| `/catalog/fields` | GET | Search catalog with filters |

#### Dynamic Parameter Resolver
Converts any unknown query parameter into a metadata filter. Enables searches like:
```
GET /catalog/fields?productCode=DDA&productSubCode=4S
```
Without explicitly coding support for `productCode` or `productSubCode`.

### Service Layer

#### Context Service
- **Create Context**: Validates and normalizes metadata field names
- **Update Context**: Only allows changes to optional metadata (required metadata is immutable)
- **Lifecycle Management**: Activation/deactivation, prevents deletion of contexts with data

#### Catalog Service
- **Merge Logic**: Core algorithm for processing observations
  - Computes field identity from `contextId + requiredMetadata + fieldPath`
  - Updates existing entries or creates new ones
  - Handles single-context cleanup (marks absent fields as optional)
- **Search**: Builds dynamic queries from criteria
- **Validation**: Ensures observations match context schema

#### Input Validation Service
- Sanitizes all inputs (removes control characters, enforces length limits)
- Validates XPath format
- Validates metadata keys and values

### Persistence Layer

#### Context Repository
Standard Spring Data MongoDB repository for CRUD operations on contexts.

#### Catalog Repository
Extends standard repository with custom implementation for:
- **Dynamic Queries**: Supports arbitrary metadata filters
- **Optimized Projections**: Returns only needed fields for performance
- **Index Management**: Creates compound indexes on startup

### Data Layer

MongoDB document store with two collections:
- `contexts`: Observation point definitions
- `catalog_fields`: Observed field entries

---

## Data Model

### Context Document

```javascript
// Collection: contexts
{
  "_id": "renderdata",                              // contextId
  "displayName": "Document Rendering Data",
  "description": "Fields sent to LiveCycle per document",
  "requiredMetadata": ["documentCode"],             // Determines field identity
  "optionalMetadata": ["productCode", "productSubCode"],
  "active": true,
  "createdAt": ISODate("2024-01-15T10:30:00Z"),
  "updatedAt": ISODate("2024-01-20T14:22:00Z")
}
```

**Field Definitions:**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | String | Context identifier (e.g., "renderdata", "ceremony-inbound") |
| `displayName` | String | Human-readable name |
| `description` | String | Purpose description |
| `requiredMetadata` | Array<String> | Metadata fields that determine field identity |
| `optionalMetadata` | Array<String> | Additional metadata that can be stored but doesn't affect identity |
| `active` | Boolean | Whether context accepts observations |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last modification timestamp |

### Catalog Entry Document

```javascript
// Collection: catalog_fields
{
  "_id": "field_1847362951",                        // Hash-based ID
  "contextId": "renderdata",
  "metadata": {
    "documentcode": "stmt001",                      // Lowercase normalized
    "productcode": "dda"
  },
  "fieldPath": "/Document/TaxWithholding/Amount",
  "maxOccurs": 3,
  "minOccurs": 0,
  "allowsNull": true,
  "allowsEmpty": false
}
```

**Field Definitions:**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | String | Hash of `contextId + requiredMetadata + fieldPath` |
| `contextId` | String | Reference to context |
| `metadata` | Object | Key-value pairs (all required + any optional observed) |
| `fieldPath` | String | XPath of the observed field |
| `maxOccurs` | Integer | Maximum times this field appeared in a single document |
| `minOccurs` | Integer | Minimum times (0 = sometimes absent) |
| `allowsNull` | Boolean | Has been observed with null value |
| `allowsEmpty` | Boolean | Has been observed with empty string |

### Field Identity Algorithm

```
ID = hash(contextId + "|" + sortedRequiredMetadata + "|" + fieldPath)

Example:
  contextId = "renderdata"
  requiredMetadata = {documentCode: "STMT001"}  → normalized: "documentcode=stmt001"
  fieldPath = "/Document/Balance"

  keyString = "renderdata|documentcode=stmt001|/Document/Balance"
  ID = "field_" + abs(keyString.hashCode())  →  "field_1847362951"
```

**Key Properties:**
- Deterministic: Same inputs always produce same ID
- Case-insensitive: Normalizes all metadata to lowercase before hashing
- Sorted: Metadata keys sorted alphabetically for consistency
- Collision-resistant: Uses full Java String hashCode

---

## Database Indexes

### Contexts Collection

```javascript
// Primary key (automatic)
{ "_id": 1 }

// Active contexts query
{ "active": 1 }
```

### Catalog Fields Collection

```javascript
// Primary key (automatic)
{ "_id": 1 }

// Context + fieldPath (common search pattern)
{ "contextId": 1, "fieldPath": 1 }

// FieldPath pattern search
{ "fieldPath": 1 }

// Context + metadata (for single-context cleanup queries)
{ "contextId": 1, "metadata": 1 }
```

---

## API Specification

### Context Management

#### Create Context
```http
POST /catalog/contexts
Content-Type: application/json

{
  "contextId": "renderdata",
  "displayName": "Document Rendering Data",
  "description": "Fields sent to LiveCycle per document",
  "requiredMetadata": ["documentCode"],
  "optionalMetadata": ["productCode", "productSubCode"],
  "active": true
}
```

**Response:** `201 Created`
```json
{
  "contextId": "renderdata",
  "displayName": "Document Rendering Data",
  "description": "Fields sent to LiveCycle per document",
  "requiredMetadata": ["documentCode"],
  "optionalMetadata": ["productCode", "productSubCode"],
  "active": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": null
}
```

#### List Contexts
```http
GET /catalog/contexts
```

**Response:** `200 OK`
```json
[
  {
    "contextId": "renderdata",
    "displayName": "Document Rendering Data",
    "requiredMetadata": ["documentCode"],
    "optionalMetadata": ["productCode", "productSubCode"],
    "active": true
  },
  {
    "contextId": "ceremony-inbound",
    "displayName": "Ceremony XML Inbound",
    "requiredMetadata": ["productCode", "productSubCode", "action"],
    "optionalMetadata": ["channel"],
    "active": true
  }
]
```

#### Update Context
```http
PUT /catalog/contexts/renderdata
Content-Type: application/json

{
  "requiredMetadata": ["documentCode"],
  "optionalMetadata": ["productCode", "productSubCode", "channel"]
}
```

**Response:** `200 OK`

**Note:** `requiredMetadata` must match existing value. Only `optionalMetadata` can change.

### Field Observations

#### Submit Observations
```http
POST /catalog/contexts/renderdata/observations
Content-Type: application/json

[
  {
    "metadata": {
      "documentCode": "STMT001",
      "productCode": "DDA"
    },
    "fieldPath": "/Document/Balance",
    "count": 1,
    "hasNull": false,
    "hasEmpty": false
  },
  {
    "metadata": {
      "documentCode": "STMT001",
      "productCode": "DDA"
    },
    "fieldPath": "/Document/TaxWithholding",
    "count": 3,
    "hasNull": true,
    "hasEmpty": false
  }
]
```

**Response:** `202 Accepted`

**Observation Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `metadata` | Object | Yes | Must include all required metadata for context |
| `fieldPath` | String | Yes | XPath of observed field |
| `count` | Integer | Yes | How many times field appeared in this document |
| `hasNull` | Boolean | Yes | Whether any occurrence was null |
| `hasEmpty` | Boolean | Yes | Whether any occurrence was empty string |

### Field Search

#### Basic Search
```http
GET /catalog/fields?contextId=renderdata&page=0&size=50
```

#### Search by Metadata
```http
GET /catalog/fields?contextId=renderdata&documentCode=STMT001
```

#### Cross-Context Search
```http
GET /catalog/fields?productCode=DDA
```

#### Field Path Pattern Search
```http
GET /catalog/fields?fieldPathContains=TaxWithholding
```

**Response:** `200 OK`
```json
{
  "content": [
    {
      "id": "field_1847362951",
      "contextId": "renderdata",
      "metadata": {
        "documentcode": "stmt001",
        "productcode": "dda"
      },
      "fieldPath": "/Document/TaxWithholding/Amount",
      "maxOccurs": 3,
      "minOccurs": 0,
      "allowsNull": true,
      "allowsEmpty": false
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 50
  },
  "totalElements": 1,
  "totalPages": 1
}
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `contextId` | String | Filter by context |
| `fieldPathContains` | String | Case-insensitive substring match on fieldPath |
| `page` | Integer | Page number (0-indexed) |
| `size` | Integer | Page size (default: 20, max: 100) |
| `*` | String | Any other parameter treated as metadata filter |

---

## Integration Architecture

### Legacy System Integration

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        LEGACY CEREMONY SYSTEM (.NET Framework)                       │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                          Normal Processing Flow                               │    │
│  │  Ceremony XML ──► Business Rules ──► Transforms ──► LiveCycle                 │    │
│  └──────┬────────────────────┬───────────────────────────┬──────────────────────┘    │
│         │                    │                           │                           │
│         │ Observation        │ Observation               │ Observation               │
│         │ Point 1            │ Point 2                   │ Point 3                   │
│         ▼                    ▼                           ▼                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                     Field Catalog SDK (.NET 4.8)                              │    │
│  │                                                                               │    │
│  │  • Extracts field paths from XML                                              │    │
│  │  • Builds observation DTOs                                                    │    │
│  │  • Sends async HTTP POST (fire-and-forget)                                    │    │
│  │  • Handles failures gracefully (no retry, log and continue)                   │    │
│  └──────────────────────────────────────┬────────────────────────────────────────┘    │
│                                         │                                            │
└─────────────────────────────────────────┼────────────────────────────────────────────┘
                                          │
                                          │ HTTP POST (async, best-effort)
                                          │
                                          ▼
                            ┌──────────────────────────────┐
                            │   Ceremony Field Catalog     │
                            │   POST /catalog/contexts/    │
                            │        {ctx}/observations    │
                            └──────────────────────────────┘
```

### SDK Responsibilities

The .NET SDK (in `sdks/dotnet/`) provides:

1. **XML Field Extraction**: Walks XML documents and extracts XPaths
2. **Observation Building**: Creates observation DTOs with counts and null/empty flags
3. **Async Submission**: Fire-and-forget HTTP calls to the catalog
4. **Error Handling**: Catches and logs errors without impacting main flow
5. **Configuration**: Base URL, timeout settings, context mappings

### Observation Points in Legacy System

| Point | Context | When to Fire | What to Send |
|-------|---------|--------------|--------------|
| Ceremony XML Receipt | `ceremony-inbound` | After receiving from upstream | All fields in Ceremony XML |
| BMIC XML Fetch | `bmic-inbound` | After fetching from SOR | All fields in BMIC XML |
| Pre-Render XML | `renderdata` | Before sending to LiveCycle | All fields in document-specific XML |
| OnDemand Passthrough | `ondemand` | Before forwarding to LiveCycle | All fields in passthrough XML |

---

## Deployment Architecture

### Recommended Production Setup

```
                    ┌─────────────────────────────────────┐
                    │           Load Balancer             │
                    └──────────────────┬──────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
    │  Catalog API     │    │  Catalog API     │    │  Catalog API     │
    │  Instance 1      │    │  Instance 2      │    │  Instance 3      │
    │  (Spring Boot)   │    │  (Spring Boot)   │    │  (Spring Boot)   │
    └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
             │                       │                       │
             └───────────────────────┼───────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────────┐
                    │         MongoDB Replica Set         │
                    │  ┌─────────┐ ┌─────────┐ ┌───────┐  │
                    │  │ Primary │ │Secondary│ │Arbiter│  │
                    │  └─────────┘ └─────────┘ └───────┘  │
                    └─────────────────────────────────────┘
```

### Container Deployment (Docker Compose)

```yaml
version: '3.8'
services:
  catalog-api:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATA_MONGODB_URI=mongodb://mongo:27017/ceremony_catalog
    depends_on:
      - mongo
    deploy:
      replicas: 2

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

---

## Performance Considerations

### Write Path (Observations)

- **Batch Operations**: Observations are processed in batches, with single `saveAll()` call
- **Async from Client**: Legacy system uses fire-and-forget, doesn't wait for response
- **Index Impact**: Write performance depends on index maintenance

### Read Path (Searches)

- **Compound Indexes**: Optimized for common query patterns
- **Projection**: Custom repository returns only needed fields
- **Pagination**: All searches paginated to limit result size

### Scaling Guidelines

| Volume | Recommendation |
|--------|----------------|
| < 100K fields | Single instance, single MongoDB |
| 100K - 1M fields | 2-3 API instances, MongoDB replica set |
| > 1M fields | Consider sharding MongoDB by contextId |

---

## Security Considerations

### Input Validation

- All inputs sanitized (control characters removed)
- Length limits enforced (XPath, contextId, metadata values)
- No raw user input in queries (parameterized via Criteria API)

### Network Security

- Run behind reverse proxy / load balancer
- Internal network only (not public-facing)
- TLS for MongoDB connections in production

### Access Control

- Current: No authentication (internal service)
- Future: Add API key or OAuth2 for external consumers

---

## Monitoring & Observability

### Key Metrics

| Metric | Description |
|--------|-------------|
| `observations.received` | Count of observation batches received |
| `observations.fields.count` | Total fields processed |
| `merge.duration` | Time to process observation batch |
| `search.duration` | Time to execute search queries |
| `mongodb.connections` | Active MongoDB connections |

### Health Endpoints

- `/actuator/health` - Overall health status
- `/actuator/health/mongo` - MongoDB connectivity
- `/actuator/info` - Application info

### Logging

Query performance logging available via `QueryPerformanceAspect`:
- Logs slow queries (configurable threshold)
- Can be enabled/disabled via configuration

---

## Future Considerations

### Potential Enhancements

1. **Export API**: Generate XSD/JSON Schema from catalog data
2. **Diff API**: Compare field lists between product codes or time periods
3. **Web UI**: Dashboard for browsing and analyzing catalog
4. **Webhooks**: Notify external systems when new fields discovered
5. **Retention Policy**: Archive/purge old observation data

### Extension Points

- **New Contexts**: Add via API, no code changes
- **New Metadata**: Add to optional metadata, no code changes
- **New Search Filters**: Extend `CatalogSearchCriteria` and custom repository
- **New Integrations**: SDK for other languages (Java, Python)
