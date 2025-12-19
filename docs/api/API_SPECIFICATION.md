# Ceremony Field Catalog API Specification

## Overview

The Ceremony Field Catalog API is a Spring Boot REST service that tracks XML field usage patterns across multiple business contexts. The API uses a **dynamic Context system** where observation points are defined via API, not hardcoded.

## Core Concepts

### Context
A **Context** defines an observation point with its own metadata schema:
- `contextId`: Unique identifier (e.g., "deposits", "renderdata", "ondemand")
- `requiredMetadata`: Fields that determine field identity (e.g., `["productCode", "productSubCode", "action"]`)
- `optionalMetadata`: Additional fields that can be stored but don't affect identity
- `active`: Whether the context accepts new observations

### CatalogEntry
A **CatalogEntry** represents an observed field:
- `id`: Hash-based unique identifier
- `contextId`: Which context this field belongs to
- `metadata`: Key-value pairs (required + optional metadata)
- `fieldPath`: XPath of the observed field
- `maxOccurs` / `minOccurs`: Occurrence statistics
- `allowsNull` / `allowsEmpty`: Value characteristics

### Field Identity
Field identity is computed as: `hash(contextId + requiredMetadata + fieldPath)`
- Same context + same required metadata + same fieldPath = same field (stats merge)
- Optional metadata is stored but doesn't affect identity

## Base Configuration

### Endpoints
- **Development:** `http://localhost:8080`
- **Production:** Configure via environment variable `SPRING_DATA_MONGODB_URI`

### Authentication
- **Current:** No authentication required
- **Future:** May require API key or JWT tokens

### CORS Configuration
- Configured to allow requests from `http://localhost:5173` (Vite) and `http://localhost:3000` for development
- Production origins configured separately

### OpenAPI/Swagger
- **Swagger UI:** `http://localhost:8080/swagger-ui.html`
- **OpenAPI Spec:** `http://localhost:8080/v3/api-docs`

---

## API Endpoints

### Context Management

#### 1. Create Context

**Endpoint:** `POST /catalog/contexts`

**Purpose:** Create a new observation context that defines metadata requirements

**Request:**
```json
{
  "contextId": "deposits",
  "displayName": "Deposits",
  "description": "Ceremony XML processing for account deposits",
  "requiredMetadata": ["productCode", "productSubCode", "action"],
  "optionalMetadata": ["channel", "region"],
  "active": true
}
```

**Response:** `201 Created`
```json
{
  "contextId": "deposits",
  "displayName": "Deposits",
  "description": "Ceremony XML processing for account deposits",
  "requiredMetadata": ["productCode", "productSubCode", "action"],
  "optionalMetadata": ["channel", "region"],
  "active": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": null
}
```

**Validation Rules:**
- `contextId`: Required, unique, alphanumeric with hyphens
- `displayName`: Required
- `requiredMetadata`: Required, cannot be empty
- `active`: Required

---

#### 2. List All Contexts

**Endpoint:** `GET /catalog/contexts`

**Purpose:** Retrieve all available contexts

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `includeCounts` | boolean | No | Include field count for each context (default: false) |

**Response (without includeCounts):** `200 OK`
```json
[
  {
    "contextId": "deposits",
    "displayName": "Deposits",
    "description": "Ceremony XML processing for account deposits",
    "requiredMetadata": ["productCode", "productSubCode", "action"],
    "optionalMetadata": ["channel"],
    "active": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": null
  },
  {
    "contextId": "renderdata",
    "displayName": "Document Rendering Data",
    "description": "Fields sent to PDF Generation API per document",
    "requiredMetadata": ["documentCode"],
    "optionalMetadata": ["productCode", "productSubCode"],
    "active": true,
    "createdAt": "2024-01-16T08:00:00Z",
    "updatedAt": null
  }
]
```

**Response (with includeCounts=true):** `200 OK`
```json
[
  {
    "contextId": "deposits",
    "displayName": "Deposits",
    "description": "Ceremony XML processing for account deposits",
    "requiredMetadata": ["productCode", "productSubCode", "action"],
    "optionalMetadata": ["channel"],
    "active": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": null,
    "fieldCount": 1247
  }
]
```

---

#### 3. Get Context by ID

**Endpoint:** `GET /catalog/contexts/{contextId}`

**Purpose:** Retrieve a specific context

**Response:** `200 OK` or `404 Not Found`

---

#### 4. Update Context

**Endpoint:** `PUT /catalog/contexts/{contextId}`

**Purpose:** Update an existing context (optional metadata only)

**Request:**
```json
{
  "contextId": "deposits",
  "displayName": "Deposits",
  "description": "Updated description",
  "requiredMetadata": ["productCode", "productSubCode", "action"],
  "optionalMetadata": ["channel", "region", "businessUnit"],
  "active": true
}
```

**Important:** `requiredMetadata` **cannot be changed** after creation (would invalidate existing field IDs). Only `optionalMetadata`, `displayName`, `description`, and `active` can be modified.

**Response:** `200 OK` or `400 Bad Request` if trying to modify required metadata

---

#### 5. Delete Context

**Endpoint:** `DELETE /catalog/contexts/{contextId}`

**Purpose:** Delete a context (also removes associated field observations)

**Response:** `204 No Content` or `404 Not Found`

---

### Field Observations

#### 6. Submit Field Observations

**Endpoint:** `POST /catalog/contexts/{contextId}/observations`

**Purpose:** Submit field observations for a specific context

**Path Parameters:**
- `contextId`: The target context (e.g., "deposits", "renderdata")

**Request:**
```json
[
  {
    "metadata": {
      "productCode": "DDA",
      "productSubCode": "4S",
      "action": "Fulfillment"
    },
    "fieldPath": "/Ceremony/Accounts/Account/FeeCode/Amount",
    "count": 1,
    "hasNull": false,
    "hasEmpty": false
  },
  {
    "metadata": {
      "productCode": "DDA",
      "productSubCode": "4S",
      "action": "Fulfillment"
    },
    "fieldPath": "/Ceremony/Accounts/Account/WithholdingCode",
    "count": 1,
    "hasNull": true,
    "hasEmpty": false
  }
]
```

**Response:** `204 No Content`

**Validation Rules:**
- `metadata`: Must include all `requiredMetadata` fields defined by the context
- `metadata`: Cannot include fields not in `requiredMetadata` or `optionalMetadata`
- `fieldPath`: Required, valid XPath format
- `count`: Required, non-negative integer
- `hasNull` / `hasEmpty`: Required booleans

**Error Responses:**
- `400 Bad Request`: Context not found, missing required metadata, unexpected metadata field
- `500 Internal Server Error`: Database or processing error

**Business Logic:**
- If field already exists (same contextId + requiredMetadata + fieldPath): merge stats
  - `maxOccurs` = max(existing, new count)
  - `minOccurs` = min(existing, new count)
  - `allowsNull` = existing OR new hasNull
  - `allowsEmpty` = existing OR new hasEmpty
- If field doesn't exist: create new entry
- Single-context cleanup: If all observations have same metadata, existing fields not in batch get `minOccurs = 0`

---

### Field Search

#### 7. Search Catalog Fields

**Endpoint:** `GET /catalog/fields`

**Purpose:** Search and retrieve cataloged fields with filtering and pagination

**Two Search Modes:**

1. **Global Search (`q`)**: OR-based search across fieldPath, contextId, AND metadata values. Best for quick, exploratory searches.
2. **Filter Search**: AND-based search with specific filters. Best for precise queries.

When `q` is provided, other filter parameters are ignored.

**String/Regex Mode:** The `useRegex` parameter controls how search terms are interpreted:
- `useRegex=false` (default): Literal string matching with special characters escaped
- `useRegex=true`: Search term treated as regex pattern

**Active Context Filtering:** Results are automatically filtered to only include fields from **active contexts**. Fields belonging to inactive contexts are never returned. This applies to both search modes and autocomplete suggestions.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No | Global search term - searches fieldPath, contextId, AND metadata values using OR logic. When provided, other filters are ignored. |
| `contextId` | string | No | Filter by context (omit for cross-context search) |
| `fieldPathContains` | string | No | Pattern match on fieldPath. When `useRegex=false` (default), special characters are escaped for literal matching. When `useRegex=true`, treated as regex pattern. |
| `useRegex` | boolean | No | When `true`, treat `q` and `fieldPathContains` as regex patterns. Default: `false` (literal string matching). |
| `page` | integer | No | Page number (0-based, default: 0) |
| `size` | integer | No | Page size (1-250, default: 50) |
| `*` | string | No | Any other parameter treated as metadata filter |

**Global Search Examples:**

```bash
# Find fields containing "Amount" in fieldPath, contextId, or any metadata value
GET /catalog/fields?q=Amount

# Find fields related to "deposit"
GET /catalog/fields?q=deposit

# Regex search across all fields
GET /catalog/fields?q=^/Ceremony/.*Amount&useRegex=true
```

**Filter Search Examples:**

```bash
# Search within a context
GET /catalog/fields?contextId=deposits&page=0&size=50

# Search by document code (renderdata context)
GET /catalog/fields?contextId=renderdata&documentCode=STMT001

# Cross-context search by metadata
GET /catalog/fields?productCode=DDA

# Search by field path pattern
GET /catalog/fields?fieldPathContains=WithholdingCode

# Combined filters (AND logic)
GET /catalog/fields?contextId=deposits&productCode=DDA&fieldPathContains=Account
```

**Dynamic Metadata Filtering:**
Any query parameter not in the standard list becomes a metadata filter:
```
GET /catalog/fields?contextId=deposits&productCode=DDA&productSubCode=4S
```
This filters for fields where `metadata.productCode = "DDA"` AND `metadata.productSubCode = "4S"`.

**Response:** `200 OK`
```json
{
  "content": [
    {
      "id": "field_377301301",
      "contextId": "deposits",
      "metadata": {
        "action": "fulfillment",
        "productcode": "dda",
        "productsubcode": "4s"
      },
      "fieldPath": "/Ceremony/Accounts/Account/FeeCode/Amount",
      "maxOccurs": 1,
      "minOccurs": 1,
      "allowsNull": false,
      "allowsEmpty": false
    },
    {
      "id": "field_892147632",
      "contextId": "deposits",
      "metadata": {
        "action": "fulfillment",
        "productcode": "dda",
        "productsubcode": "4s"
      },
      "fieldPath": "/Ceremony/Accounts/Account/WithholdingCode",
      "maxOccurs": 1,
      "minOccurs": 0,
      "allowsNull": true,
      "allowsEmpty": false
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 50,
    "sort": {
      "empty": true,
      "sorted": false,
      "unsorted": true
    },
    "offset": 0,
    "paged": true,
    "unpaged": false
  },
  "last": true,
  "totalElements": 2,
  "totalPages": 1,
  "first": true,
  "size": 50,
  "number": 0,
  "sort": {
    "empty": true,
    "sorted": false,
    "unsorted": true
  },
  "numberOfElements": 2,
  "empty": false
}
```

**Note:** Metadata keys and values are normalized to lowercase for case-insensitive matching.

---

#### 8. Suggest Values (Autocomplete)

**Endpoint:** `GET /catalog/suggest`

**Purpose:** Get autocomplete suggestions for fieldPath or metadata values

**Active Context Filtering:** Suggestions are automatically scoped to **active contexts only**. Values from inactive contexts are never suggested.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `field` | string | Yes | Field to suggest for: `fieldPath` or `metadata.{name}` |
| `prefix` | string | No | Prefix to match (case-insensitive) |
| `contextId` | string | No | Scope suggestions to a specific context |
| `limit` | integer | No | Maximum suggestions to return (default: 10, max: 100) |
| `metadata.*` | string | No | Additional metadata filters to scope suggestions |

**Example Requests:**

```bash
# Cross-context fieldPath suggestions
GET /catalog/suggest?field=fieldPath&prefix=/Ceremony/Acc&limit=15

# Scoped fieldPath suggestions (within context and metadata)
GET /catalog/suggest?field=fieldPath&prefix=/Ceremony/Acc&contextId=deposits&metadata.productCode=DDA

# Metadata value suggestions
GET /catalog/suggest?field=metadata.productCode&prefix=DD&contextId=deposits
```

**Response:** `200 OK`
```json
[
  "/Ceremony/Account/Amount",
  "/Ceremony/Account/Balance",
  "/Ceremony/Account/FeeCode"
]
```

**Notes:**
- Suggestions are case-insensitive prefix matches
- Results are sorted alphabetically and limited to the specified max
- For `fieldPath`, prefix should start with `/` for path suggestions
- For metadata values, prefix can be any partial match

---

## Data Models

### Context

```typescript
interface Context {
  contextId: string;           // Unique identifier
  displayName: string;         // Human-readable name
  description?: string;        // Optional description
  requiredMetadata: string[];  // Fields that determine field identity
  optionalMetadata: string[];  // Additional allowed fields
  active: boolean;             // Whether accepting observations
  createdAt: string;           // ISO 8601 timestamp
  updatedAt?: string;          // ISO 8601 timestamp
}
```

### CatalogEntry

```typescript
interface CatalogEntry {
  id: string;                           // Hash-based unique ID (e.g., "field_377301301")
  contextId: string;                    // Reference to context
  metadata: Record<string, string>;     // Key-value pairs (lowercase normalized)
  fieldPath: string;                    // XPath of the field
  maxOccurs: number;                    // Maximum occurrences observed
  minOccurs: number;                    // Minimum occurrences (0 = sometimes absent)
  allowsNull: boolean;                  // Has been observed with null
  allowsEmpty: boolean;                 // Has been observed with empty string
}
```

### CatalogObservation (Input)

```typescript
interface CatalogObservation {
  metadata: Record<string, string>;  // Must include all required metadata
  fieldPath: string;                 // XPath of the field
  count: number;                     // Occurrences in this observation (>=0)
  hasNull: boolean;                  // Contains null values
  hasEmpty: boolean;                 // Contains empty strings
}
```

### PagedResponse

```typescript
interface PagedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: { empty: boolean; sorted: boolean; unsorted: boolean };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalElements: number;
  totalPages: number;
  first: boolean;
  size: number;
  number: number;
  sort: { empty: boolean; sorted: boolean; unsorted: boolean };
  numberOfElements: number;
  empty: boolean;
}
```

### ErrorResponse

```typescript
interface ErrorResponse {
  message: string;           // Human-readable error message
  status: number;            // HTTP status code
  timestamp: string;         // ISO 8601 timestamp
  error: string;             // Error type (e.g., "Bad Request", "Validation Error")
  errors?: string[];         // Optional array of validation error messages
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET request |
| 201 | Created | Successful POST creating a resource |
| 204 | No Content | Successful POST/DELETE with no response body |
| 400 | Bad Request | Validation error, missing required fields, invalid format |
| 404 | Not Found | Context or resource doesn't exist |
| 500 | Internal Server Error | Server-side error |

### Common Error Scenarios

**Context not found:**
```json
{
  "message": "Context not found or inactive: invalid-context",
  "status": 400,
  "timestamp": "2024-01-15T10:30:00Z",
  "error": "Bad Request"
}
```

**Missing required metadata:**
```json
{
  "message": "Required metadata field missing: productCode",
  "status": 400,
  "timestamp": "2024-01-15T10:30:00Z",
  "error": "Bad Request"
}
```

**Unexpected metadata field:**
```json
{
  "message": "Unexpected metadata field: unknownField. Allowed fields: [productCode, productSubCode, action, channel]",
  "status": 400,
  "timestamp": "2024-01-15T10:30:00Z",
  "error": "Bad Request"
}
```

---

## Example Workflows

### Setting Up a New Context

```bash
# 1. Create the context
POST /catalog/contexts
{
  "contextId": "renderdata",
  "displayName": "Document Rendering Data",
  "description": "Fields sent to PDF Generation API per document",
  "requiredMetadata": ["documentCode"],
  "optionalMetadata": ["productCode", "productSubCode"],
  "active": true
}

# 2. Submit observations
POST /catalog/contexts/renderdata/observations
[
  {
    "metadata": { "documentCode": "STMT001", "productCode": "DDA" },
    "fieldPath": "/Document/Balance",
    "count": 1,
    "hasNull": false,
    "hasEmpty": false
  }
]

# 3. Search results
GET /catalog/fields?contextId=renderdata&documentCode=STMT001
```

### Cross-Context Analysis

```bash
# Find all fields with productCode=DDA across any context
GET /catalog/fields?productCode=DDA

# Find all fields containing "Tax" in the path
GET /catalog/fields?fieldPathContains=Tax

# Compare deposits vs renderdata for same product
GET /catalog/fields?contextId=deposits&productCode=DDA
GET /catalog/fields?contextId=renderdata&productCode=DDA
```

---

## Rate Limiting & Performance

### Current Limits
- No rate limiting implemented
- Page size maximum: 250 records
- Query timeout: Configurable via application properties

### Performance Considerations
- Indexed fields: contextId, fieldPath, metadata combinations
- FieldPath searches use regex (may be slower on large datasets)
- Batch submissions recommended for large observation sets

---

## Future API Changes

### Planned Enhancements
- Authentication/authorization
- Field statistics endpoints
- Bulk export functionality (CSV, XSD generation)
- Real-time field observation streaming
- Advanced search with multiple fieldPath patterns

### Backward Compatibility
- Current API will remain stable
- New features will be additive
- Breaking changes will be versioned (e.g., /v2/catalog/fields)
