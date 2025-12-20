# Field Value Capture Feature

## Overview

Enable optional capture and retrieval of observed field values within the Ceremony Field Catalog. This feature allows callers to selectively send actual field values alongside observations, providing insight into the data patterns for specific fields.

---

## Why: Motivation & Use Cases

### The Problem

Currently, the catalog tracks **structural** information about XML fields:
- Field paths (XPath)
- Cardinality (minOccurs, maxOccurs)
- Null/empty allowance

But it doesn't capture **semantic** information - what values actually appear in these fields. When reverse-engineering a schema from legacy XML, understanding the value domain is critical:

- Is `/loan_info/loan_type` an enumeration? What are the valid values?
- Does `/borrower/state` use full names or abbreviations?
- Is `/amount` always a round number or does it have decimals?

### Use Cases

| Use Case | Description |
|----------|-------------|
| **Schema Inference** | Identify enumerated fields vs free-text by observing value cardinality |
| **Data Quality** | Spot unexpected values (e.g., "N/A" in a numeric field) |
| **Documentation** | Auto-generate field documentation with example values |
| **Migration Planning** | Understand value patterns before designing target schema |
| **Validation Rules** | Derive regex patterns or value constraints from observed data |

### Why Opt-In Per Field?

Not all fields should capture values:

| Field Type | Capture? | Reason |
|------------|----------|--------|
| `/loan_type` | Yes | Likely enumeration, low cardinality |
| `/borrower/ssn` | **No** | PII - never capture |
| `/borrower/name` | **No** | High cardinality, limited value |
| `/amount` | Maybe | Could reveal value patterns |
| `/@version` | Yes | Likely small set of versions |

The SDK config file approach lets teams explicitly whitelist fields for value capture.

---

## What: Feature Specification

### Constraints

1. **FieldKey Scoped**: Values are stored per FieldKey (contextId + requiredMetadata + fieldPath), never aggregated across FieldKeys
2. **Bounded Storage**: Maximum 15 distinct values stored per field (top by occurrence count)
3. **Truncated Values**: Values truncated to 100 characters to prevent storage abuse
4. **Opt-In Only**: SDK only sends values for explicitly configured fields

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT SIDE                                   │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │  ceremony-values.config.json                                      │  │
│   │  {                                                                │  │
│   │    "captureValuesFor": [                                          │  │
│   │      "/loan_info/loan_type",                                      │  │
│   │      "/loan_info/borrower/primaryborrower/employment/type",       │  │
│   │      "/loan_info/@version"                                        │  │
│   │    ]                                                              │  │
│   │  }                                                                │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │  SDK Observation Builder                                          │  │
│   │                                                                   │  │
│   │  for each field in XML:                                           │  │
│   │    obs = { fieldPath, count, hasNull, hasEmpty }                  │  │
│   │                                                                   │  │
│   │    if fieldPath in captureValuesFor:                              │  │
│   │      obs.value = truncate(fieldValue, 100)                        │  │
│   │                                                                   │  │
│   │    observations.add(obs)                                          │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
└────────────────────────────────────│─────────────────────────────────────┘
                                     │
                                     ▼
                    POST /catalog/contexts/{contextId}/observations
                    [
                      { "fieldPath": "/loan_type", "count": 1, "value": "HELOC" },
                      { "fieldPath": "/amount", "count": 1 }  // no value - not configured
                    ]
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            SERVER SIDE                                   │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │  CatalogService.mergeObservation()                                │  │
│   │                                                                   │  │
│   │  // Existing logic: update minOccurs, maxOccurs, etc.             │  │
│   │                                                                   │  │
│   │  if (observation.value != null):                                  │  │
│   │    upsertObservedValue(fieldEntry, observation.value)             │  │
│   │    // Increment count if exists, add if new                       │  │
│   │    // Keep only top 15 by count                                   │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │  MongoDB: catalog_fields                                          │  │
│   │                                                                   │  │
│   │  {                                                                │  │
│   │    "_id": "field_abc123",                                         │  │
│   │    "fieldPath": "/loan_info/loan_type",                           │  │
│   │    "contextId": "loans",                                          │  │
│   │    "metadata": { "productCode": "heloc" },                        │  │
│   │    ...                                                            │  │
│   │    "observedValues": [                                            │  │
│   │      { "value": "HELOC", "count": 1523, "lastSeen": "..." },      │  │
│   │      { "value": "HELOC_FIXED", "count": 892, "lastSeen": "..." }  │  │
│   │    ],                                                             │  │
│   │    "valueStats": {                                                │  │
│   │      "totalObservations": 2415,                                   │  │
│   │      "distinctCount": 2,                                          │  │
│   │      "captureEnabled": true                                       │  │
│   │    }                                                              │  │
│   │  }                                                                │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### FieldKey Scoping (Critical)

Values are **always scoped to a FieldKey**. The same XPath in different FieldKeys represents different business contexts:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FieldKey A                              FieldKey B                      │
│  ─────────                               ─────────                       │
│  contextId: loans                        contextId: loans                │
│  productCode: heloc                      productCode: conventional       │
│                                                                          │
│  /loan_info/loan_type                    /loan_info/loan_type            │
│  ┌─────────────────────┐                 ┌─────────────────────┐         │
│  │ Values:             │                 │ Values:             │         │
│  │ • HELOC      (80%)  │                 │ • CONV_30    (60%)  │         │
│  │ • HELOC_FIXED (20%) │                 │ • CONV_15    (25%)  │         │
│  └─────────────────────┘                 │ • ARM_5_1    (15%)  │         │
│                                          └─────────────────────┘         │
│                                                                          │
│  These are DIFFERENT fields with DIFFERENT value domains                 │
│  The fieldId hash ensures they are stored separately                     │
└─────────────────────────────────────────────────────────────────────────┘
```

**The API only allows retrieving values for a specific `fieldId`**, which already encodes the full FieldKey. Cross-FieldKey aggregation is architecturally prevented.

---

## How: Implementation Plan

### Phase 1: MongoDB Schema Update

**Changes to `catalog_fields` collection:**

```javascript
// New fields added to CatalogEntry document
{
  // ... existing fields ...

  // NEW: Array of observed values (max 15, sorted by count desc)
  "observedValues": [
    {
      "value": "HELOC",           // The observed value (truncated to 100 chars)
      "count": 1523,              // Number of times observed
      "firstSeen": ISODate(...),  // When first observed
      "lastSeen": ISODate(...)    // Most recent observation
    }
  ],

  // NEW: Aggregate statistics
  "valueStats": {
    "totalObservations": 2415,    // Total value observations received
    "distinctCount": 2,           // Unique values seen (may exceed 15 if overflow)
    "overflowCount": 0,           // Values dropped due to 15-value limit
    "lastUpdated": ISODate(...)
  }
}
```

**Index considerations:**
- No new indexes required - values are embedded in existing documents
- Queries always start with `fieldId` lookup (already indexed)

### Phase 2: API Changes

#### 2.1 Update Observation DTO

```java
// CatalogObservationDTO.java
public class CatalogObservationDTO {
    private Map<String, String> metadata;
    private String fieldPath;
    private int count;
    private boolean hasNull;
    private boolean hasEmpty;

    // NEW - optional field value
    @Nullable
    @Size(max = 500, message = "Value must not exceed 500 characters")
    private String value;

    // Getters/setters...
}
```

#### 2.2 Update CatalogService

```java
// CatalogService.java
public void mergeObservation(String contextId, CatalogObservationDTO obs) {
    // ... existing merge logic for cardinality, null, empty ...

    // NEW: Handle value capture
    if (obs.getValue() != null && !obs.getValue().isBlank()) {
        String truncatedValue = truncate(obs.getValue(), 100);
        upsertObservedValue(entry, truncatedValue);
    }
}

private void upsertObservedValue(CatalogEntry entry, String value) {
    List<ObservedValue> values = entry.getObservedValues();
    if (values == null) {
        values = new ArrayList<>();
        entry.setObservedValues(values);
    }

    // Find existing or create new
    Optional<ObservedValue> existing = values.stream()
        .filter(v -> v.getValue().equals(value))
        .findFirst();

    if (existing.isPresent()) {
        existing.get().incrementCount();
        existing.get().setLastSeen(Instant.now());
    } else {
        values.add(new ObservedValue(value, 1, Instant.now(), Instant.now()));
    }

    // Sort by count desc and keep top 15
    values.sort((a, b) -> Long.compare(b.getCount(), a.getCount()));
    if (values.size() > 15) {
        int overflow = values.size() - 15;
        values.subList(15, values.size()).clear();
        entry.getValueStats().incrementOverflow(overflow);
    }

    // Update stats
    entry.getValueStats().incrementTotalObservations();
    entry.getValueStats().recalculateDistinctCount(values.size());
}
```

#### 2.3 New Values Endpoint

```java
// CatalogController.java

/**
 * Get observed values for a specific field.
 * Values are scoped to the FieldKey (contextId + requiredMetadata + fieldPath).
 */
@GetMapping("/fields/{fieldId}/values")
public ResponseEntity<FieldValuesResponse> getFieldValues(
    @PathVariable String fieldId,
    @RequestParam(defaultValue = "15") @Max(15) int limit
) {
    CatalogEntry entry = catalogService.findById(fieldId)
        .orElseThrow(() -> new FieldNotFoundException(fieldId));

    return ResponseEntity.ok(FieldValuesResponse.builder()
        .fieldId(fieldId)
        .fieldPath(entry.getFieldPath())
        .contextId(entry.getContextId())
        .metadata(entry.getMetadata())
        .values(entry.getObservedValues().stream()
            .limit(limit)
            .map(this::toValueDTO)
            .toList())
        .stats(entry.getValueStats())
        .build());
}
```

**Response DTO:**

```java
@Data
@Builder
public class FieldValuesResponse {
    private String fieldId;
    private String fieldPath;
    private String contextId;
    private Map<String, String> metadata;
    private List<ObservedValueDTO> values;
    private ValueStatsDTO stats;
}

@Data
public class ObservedValueDTO {
    private String value;
    private long count;
    private double percentage;  // Calculated: count / totalObservations * 100
    private String firstSeen;
    private String lastSeen;
}

@Data
public class ValueStatsDTO {
    private long totalObservations;
    private int distinctCount;
    private int overflowCount;
    private boolean hasValues;  // True if any values captured
}
```

### Phase 3: SDK Updates

#### 3.1 Configuration File Format

```json
// ceremony-values.json
{
  "$schema": "https://ceremony-catalog.example.com/schemas/values-config.json",
  "version": "1.0",
  "description": "Fields to capture values for in HELOC processing",
  "captureValuesFor": [
    "/loan_info/loan_type",
    "/loan_info/borrower/primaryborrower/employment/type",
    "/loan_info/borrower/primaryborrower/employment/status",
    "/loan_info/@version"
  ],
  "options": {
    "maxValueLength": 100,
    "excludePatterns": [
      ".*ssn.*",
      ".*password.*",
      ".*secret.*"
    ]
  }
}
```

#### 3.2 .NET SDK Implementation

```csharp
// CeremonyClientOptions.cs
public class CeremonyClientOptions
{
    public string BaseUrl { get; set; }
    public string ContextId { get; set; }

    // NEW: Value capture configuration
    public string ValueCaptureConfigPath { get; set; }
    public ISet<string> CaptureValuesFor { get; set; } = new HashSet<string>();
}

// CeremonyClient.cs
public class CeremonyClient
{
    private readonly HashSet<string> _valueCaptureSet;
    private readonly List<Regex> _excludePatterns;

    public CeremonyClient(CeremonyClientOptions options)
    {
        // Load from config file if specified
        if (!string.IsNullOrEmpty(options.ValueCaptureConfigPath))
        {
            var config = LoadValueConfig(options.ValueCaptureConfigPath);
            _valueCaptureSet = new HashSet<string>(config.CaptureValuesFor);
            _excludePatterns = config.Options.ExcludePatterns
                .Select(p => new Regex(p, RegexOptions.IgnoreCase))
                .ToList();
        }
        else
        {
            _valueCaptureSet = new HashSet<string>(options.CaptureValuesFor);
            _excludePatterns = new List<Regex>();
        }
    }

    public Observation CreateObservation(string fieldPath, string value = null)
    {
        var obs = new Observation
        {
            FieldPath = fieldPath,
            Count = 1
        };

        // Only include value if:
        // 1. Field is in capture list
        // 2. Value is not null/empty
        // 3. Field doesn't match exclude patterns
        if (ShouldCaptureValue(fieldPath) && !string.IsNullOrEmpty(value))
        {
            obs.Value = Truncate(value, 100);
        }

        return obs;
    }

    private bool ShouldCaptureValue(string fieldPath)
    {
        if (!_valueCaptureSet.Contains(fieldPath))
            return false;

        // Check exclude patterns (safety net for PII)
        return !_excludePatterns.Any(p => p.IsMatch(fieldPath));
    }
}
```

#### 3.3 Python SDK Implementation

```python
# ceremony_client.py
import json
import re
from dataclasses import dataclass
from typing import Optional, Set, List

@dataclass
class ValueCaptureConfig:
    capture_values_for: Set[str]
    exclude_patterns: List[re.Pattern]
    max_value_length: int = 100

class CeremonyClient:
    def __init__(
        self,
        base_url: str,
        context_id: str,
        value_capture_config: Optional[str] = None,
        capture_values_for: Optional[List[str]] = None
    ):
        self.base_url = base_url
        self.context_id = context_id
        self._value_config = self._load_value_config(
            value_capture_config,
            capture_values_for
        )

    def _load_value_config(self, config_path, capture_list) -> ValueCaptureConfig:
        if config_path:
            with open(config_path) as f:
                data = json.load(f)
            return ValueCaptureConfig(
                capture_values_for=set(data.get('captureValuesFor', [])),
                exclude_patterns=[
                    re.compile(p, re.IGNORECASE)
                    for p in data.get('options', {}).get('excludePatterns', [])
                ],
                max_value_length=data.get('options', {}).get('maxValueLength', 100)
            )
        return ValueCaptureConfig(
            capture_values_for=set(capture_list or []),
            exclude_patterns=[]
        )

    def create_observation(
        self,
        field_path: str,
        value: Optional[str] = None
    ) -> dict:
        obs = {
            'fieldPath': field_path,
            'count': 1
        }

        if self._should_capture_value(field_path) and value:
            obs['value'] = value[:self._value_config.max_value_length]

        return obs

    def _should_capture_value(self, field_path: str) -> bool:
        if field_path not in self._value_config.capture_values_for:
            return False

        # Safety check against exclude patterns
        for pattern in self._value_config.exclude_patterns:
            if pattern.search(field_path):
                return False

        return True
```

### Phase 4: UI Implementation

#### 4.1 Schema Search Table Enhancement

Add a "values" indicator column to the FieldTable:

```typescript
// FieldTable.tsx - new column

// In the table header
<th className="w-12 px-2 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
  <Database className="w-3 h-3 inline-block" title="Values" />
</th>

// In the table row
<td className="px-2 py-3 text-center">
  {entry.valueStats?.hasValues && (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onShowValues(entry);
      }}
      className="text-ceremony hover:text-ceremony-hover transition-colors"
      title={`${entry.valueStats.distinctCount} distinct values observed`}
    >
      <Database className="w-4 h-4" />
    </button>
  )}
</td>
```

#### 4.2 Values Panel Component

```typescript
// FieldValuesPanel.tsx
interface FieldValuesPanelProps {
  fieldId: string;
  fieldPath: string;
  onClose: () => void;
}

const FieldValuesPanel: React.FC<FieldValuesPanelProps> = ({
  fieldId,
  fieldPath,
  onClose
}) => {
  const { data, isLoading } = useFieldValues(fieldId);

  if (isLoading) return <Skeleton />;

  return (
    <div className="w-[500px] bg-white border-l border-steel shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-steel bg-paper">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest">
            Observed Values
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <p className="text-xs text-slate-500 font-mono mt-1">{fieldPath}</p>
      </div>

      {/* Stats */}
      <div className="p-4 bg-slate-50 border-b border-steel">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-black text-ink">
              {data.stats.totalObservations.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">
              Observations
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-ink">
              {data.stats.distinctCount}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">
              Distinct
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-ink">
              {data.values.length}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">
              Shown
            </div>
          </div>
        </div>
      </div>

      {/* Values Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-paper sticky top-0">
            <tr className="border-b border-steel">
              <th className="px-4 py-2 text-left text-xs font-bold uppercase text-slate-500">
                Value
              </th>
              <th className="px-4 py-2 text-right text-xs font-bold uppercase text-slate-500">
                Count
              </th>
              <th className="px-4 py-2 text-right text-xs font-bold uppercase text-slate-500">
                %
              </th>
              <th className="px-4 py-2 text-right text-xs font-bold uppercase text-slate-500">
                Last Seen
              </th>
            </tr>
          </thead>
          <tbody>
            {data.values.map((v, i) => (
              <tr key={i} className="border-b border-steel/50 hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-sm truncate max-w-[200px]">
                  {v.value}
                </td>
                <td className="px-4 py-2 text-right text-sm font-medium">
                  {v.count.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 bg-slate-200 rounded overflow-hidden">
                      <div
                        className="h-full bg-ceremony"
                        style={{ width: `${v.percentage}%` }}
                      />
                    </div>
                    <span className="text-slate-500 w-12">
                      {v.percentage.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 text-right text-xs text-slate-500 font-mono">
                  {formatDate(v.lastSeen)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Overflow Warning */}
      {data.stats.overflowCount > 0 && (
        <div className="p-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-700">
          <AlertTriangle className="w-3 h-3 inline mr-1" />
          {data.stats.overflowCount} additional values were observed but not stored
          (limited to top 15 by frequency).
        </div>
      )}
    </div>
  );
};
```

#### 4.3 UI Mock

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  SCHEMA SEARCH                                                                   │
│  ┌─────────┐ ┌─────────────┐                                                    │
│  │ loans ▼ │ │ heloc     ▼ │                                    [Search]        │
│  └─────────┘ └─────────────┘                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  125 fields                                              [Export Schema ▼]      │
│                                                                                  │
│  ┌────┬────────┬─────┬────────────────────────────────┬─────┬─────┬──────┬────┐ │
│  │    │ ALERTS │ VAL │ FIELD PATH                     │ MIN │ MAX │ NULL │ ...│ │
│  ├────┼────────┼─────┼────────────────────────────────┼─────┼─────┼──────┼────┤ │
│  │ 📋 │        │ 🗃️  │ /loan_info/loan_type           │  1  │  1  │  No  │    │ │
│  │ 📋 │ ⚠ Mix  │     │ /loan_info/borrower            │  1  │  1  │  No  │    │ │
│  │ 📋 │ ℹ Attr │ 🗃️  │ /loan_info/@version            │  1  │  1  │  No  │    │ │
│  │ 📋 │        │     │ /loan_info/amount              │  1  │  1  │  No  │    │ │
│  └────┴────────┴─────┴────────────────────────────────┴─────┴─────┴──────┴────┘ │
│                                                                                  │
│  🗃️ = Click to view observed values                                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                              │
                              │ Click 🗃️ on /loan_info/loan_type
                              ▼

┌─────────────────────────────────────────────────────────────────────────────────┐
│  SCHEMA SEARCH                                         │ OBSERVED VALUES      ✕ │
│  ...                                                   │                        │
│                                                        │ /loan_info/loan_type   │
│  ┌────┬────────┬─────┬──────────────────────┬─────┐   │                        │
│  │    │ ALERTS │ VAL │ FIELD PATH           │ ... │   │ ┌────────────────────┐ │
│  ├────┼────────┼─────┼──────────────────────┼─────┤   │ │   2,415    │   2   │ │
│  │ 📋 │        │ 🗃️◀─│ /loan_info/loan_type │     │   │ │   obs      │ dist  │ │
│  │ 📋 │ ⚠ Mix  │     │ /loan_info/borrower  │     │   │ └────────────────────┘ │
│  │    │        │     │ ...                  │     │   │                        │
│  └────┴────────┴─────┴──────────────────────┴─────┘   │ VALUE       COUNT   %  │
│                                                        │ ─────────────────────  │
│                                                        │ HELOC       1,523  63% │
│                                                        │ ████████████████░░░░░  │
│                                                        │                        │
│                                                        │ HELOC_FIXED   892  37% │
│                                                        │ ██████████░░░░░░░░░░░  │
│                                                        │                        │
└────────────────────────────────────────────────────────┴────────────────────────┘
```

---

## Privacy & Security Considerations

### Data Classification

| Risk Level | Field Patterns | Handling |
|------------|---------------|----------|
| **High (PII)** | `*ssn*`, `*social*`, `*password*`, `*secret*`, `*dob*`, `*birth*` | Never capture - enforce via SDK exclude patterns |
| **Medium** | `*name*`, `*address*`, `*email*`, `*phone*` | Discourage via documentation |
| **Low** | `*type*`, `*code*`, `*status*`, `*@version*` | Safe to capture |

### SDK Safety Net

The SDK should include default exclude patterns that block common PII fields even if accidentally added to the capture list:

```json
{
  "options": {
    "excludePatterns": [
      "(?i).*ssn.*",
      "(?i).*social.*security.*",
      "(?i).*password.*",
      "(?i).*secret.*",
      "(?i).*api.?key.*",
      "(?i).*token.*"
    ]
  }
}
```

### Audit Trail

Consider logging when values are captured for compliance:

```java
// In CatalogService
if (obs.getValue() != null) {
    auditLog.info("Value captured for field {} in context {}",
        obs.getFieldPath(), contextId);
}
```

---

## Migration & Rollout

### Phase 1: Backend Only (Week 1-2)
- Add MongoDB schema fields
- Update merge logic
- Add `/fields/{fieldId}/values` endpoint
- No values captured yet - endpoint returns empty

### Phase 2: SDK Beta (Week 3-4)
- Release SDK updates with config file support
- Internal testing with non-sensitive fields
- Validate storage and retrieval

### Phase 3: UI (Week 5-6)
- Add values column indicator
- Implement values panel
- User testing

### Phase 4: GA (Week 7)
- Documentation
- SDK release to all consumers
- Monitoring dashboards

---

## Open Questions

1. **Retention Policy**: Should old values age out? Or keep forever once in top 15?
2. **Value Normalization**: Should we normalize whitespace/case before storing?
3. **Binary/Large Values**: How to handle base64 or very long values beyond truncation?
4. **Bulk Export**: Should values be included in schema exports (XSD annotations, JSON Schema examples)?

---

## Appendix: API Reference

### POST /catalog/contexts/{contextId}/observations

**Request Body (updated):**

```json
[
  {
    "metadata": { "productCode": "heloc" },
    "fieldPath": "/loan_info/loan_type",
    "count": 1,
    "hasNull": false,
    "hasEmpty": false,
    "value": "HELOC"  // NEW - optional
  }
]
```

### GET /catalog/fields/{fieldId}/values

**Response:**

```json
{
  "fieldId": "field_abc123",
  "fieldPath": "/loan_info/loan_type",
  "contextId": "loans",
  "metadata": {
    "productCode": "heloc"
  },
  "values": [
    {
      "value": "HELOC",
      "count": 1523,
      "percentage": 63.1,
      "firstSeen": "2025-01-15T10:30:00Z",
      "lastSeen": "2025-12-20T14:22:00Z"
    },
    {
      "value": "HELOC_FIXED",
      "count": 892,
      "percentage": 36.9,
      "firstSeen": "2025-02-01T09:15:00Z",
      "lastSeen": "2025-12-19T16:45:00Z"
    }
  ],
  "stats": {
    "totalObservations": 2415,
    "distinctCount": 2,
    "overflowCount": 0,
    "hasValues": true,
    "lastUpdated": "2025-12-20T14:22:00Z"
  }
}
```
