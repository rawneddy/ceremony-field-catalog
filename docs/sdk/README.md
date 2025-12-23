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

For full API documentation, see [API Specification](../api/API_SPECIFICATION.md).
