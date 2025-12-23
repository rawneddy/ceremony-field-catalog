# SDK Documentation Index

**Purpose:** Index of available client SDKs for the Ceremony Field Catalog
**Use when:** Finding the right SDK for your platform

---

## Available SDKs

| SDK | Location | Status | Use Case |
|-----|----------|--------|----------|
| **.NET Framework 4.8** | [`sdks/dotnet/net48/`](../../sdks/dotnet/net48/README.md) | Production | Legacy .NET applications |
| **Python** | [`sdks/python/`](../../sdks/python/README.md) | Test only | SDK testing and validation |

---

## Shared Design Principles

All SDKs implement the same **fire-and-forget** pattern:

- **Never throws** - All errors handled internally
- **Non-blocking** - Returns immediately, background processing
- **Bounded queue** - Drops items when full (backpressure)
- **Silent failure** - Network/API errors logged, never propagated

---

## Behavioral Parity

The Python and .NET implementations are **verified identical** in:

| Aspect | Behavior |
|--------|----------|
| Constants | Batch size 500, queue capacity 10000 |
| Initialization | Idempotent, thread-safe, trims trailing slash, validates batch size |
| Queue | Bounded, drops when full, dedicated daemon worker thread |
| XML Parsing | Only leaf elements counted, attributes with `/@` prefix |
| Empty Detection | Whitespace-only and empty strings both set `hasEmpty: true` |
| JSON Output | Field names: `metadata`, `fieldPath`, `count`, `hasNull`, `hasEmpty` |
| Error Handling | Never throws, invokes callback, swallows callback errors |

---

## API Compatibility

All SDKs target the same API endpoint:

```
POST /catalog/contexts/{contextId}/observations
```

Request body:
```json
[
  {
    "metadata": {"productCode": "DDA"},
    "fieldPath": "/Document/Amount",
    "count": 1,
    "hasNull": false,
    "hasEmpty": false
  }
]
```

For live API documentation, run the server and visit `/swagger-ui.html`.

---

## API Types (TypeScript Reference)

These type definitions match the API request/response shapes:

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

interface CatalogEntry {
  id: string;                           // Hash-based unique ID
  contextId: string;                    // Reference to context
  metadata: Record<string, string>;     // Key-value pairs (lowercase)
  fieldPath: string;                    // XPath of the field
  maxOccurs: number;                    // Maximum occurrences observed
  minOccurs: number;                    // Minimum occurrences (0 = optional)
  allowsNull: boolean;                  // Has been observed with null
  allowsEmpty: boolean;                 // Has been observed empty
}

interface CatalogObservation {
  metadata: Record<string, string>;  // Must include all required metadata
  fieldPath: string;                 // XPath of the field
  count: number;                     // Occurrences in this observation
  hasNull: boolean;                  // Contains null values
  hasEmpty: boolean;                 // Contains empty strings
}

interface ErrorResponse {
  message: string;           // Human-readable error message
  status: number;            // HTTP status code
  timestamp: string;         // ISO 8601 timestamp
  error: string;             // Error type (e.g., "Bad Request")
  errors?: string[];         // Optional validation error details
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Successful GET |
| 201 | Created - Successful POST creating resource |
| 204 | No Content - Successful observation submission |
| 400 | Bad Request - Validation error |
| 404 | Not Found - Context doesn't exist |
| 500 | Internal Server Error |

### Common Error Responses

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
  "message": "Unexpected metadata field: unknownField. Allowed: [productCode, action]",
  "status": 400,
  "timestamp": "2024-01-15T10:30:00Z",
  "error": "Bad Request"
}
```
