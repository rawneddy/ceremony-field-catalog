# How To: Observations & Merge

**Purpose:** Understand observation ingestion, merge algorithm, and SDK behavior
**Use when:** Changing upload parsing, merge logic, or SDK submission
**Don't use when:** Changing search → `search.md`, changing contexts → `contexts.md`
**Source of truth:**
- `CatalogService.java` - merge algorithm
- `CatalogObservationDTO.java` - input contract
- `ui/src/utils/xmlParser.ts` - XML parsing
- `ui/src/hooks/useXmlUpload.ts` - upload workflow
- `sdks/` - Python and .NET clients

---

## Observation Flow

```
XML File → Parser → Observations → API → Merge → Catalog Entry
```

1. **Parse:** Extract field paths and values from XML
2. **Enrich:** Attach metadata (from rules or user input)
3. **Submit:** POST to `/catalog/contexts/{contextId}/observations`
4. **Merge:** Match by field identity, update statistics

---

## Observation DTO

```java
public class CatalogObservationDTO {
    Map<String, String> metadata;  // All metadata for this observation
    String fieldPath;              // XPath to field
    int count;                     // Occurrences in source
    boolean hasNull;               // Contains xsi:nil="true"
    boolean hasEmpty;              // Contains empty string value
}
```

**Note:** Observations submit metadata as a single flat map. During merge, the service separates values based on the context schema:
- **Required metadata** values are validated and stored as `requiredMetadata` (single value per key)
- **Optional metadata** values are added to `optionalMetadata` sets (accumulated over time)

---

## API Submission

```http
POST /catalog/contexts/{contextId}/observations
Content-Type: application/json

[
  {
    "metadata": {"productCode": "dda", "channel": "online"},
    "fieldPath": "/Document/Account/Balance",
    "count": 1,
    "hasNull": false,
    "hasEmpty": false
  }
]
```

### Validation Rules

Observations are validated before processing:

| Field | Rule |
|-------|------|
| `metadata` | Must include all `requiredMetadata` fields from context |
| `metadata` | Cannot include fields not in `requiredMetadata` or `optionalMetadata` |
| `fieldPath` | Required, valid XPath format, max length enforced |
| `count` | Required, non-negative integer |
| `hasNull` / `hasEmpty` | Required booleans |

**Common rejection reasons:**
- Missing required metadata field
- Unexpected metadata field not in context schema
- Context not found or inactive

---

## Merge Algorithm

**Field Identity:** `hash(contextId + requiredMetadata + fieldPath)`

**Key Design:** Each unique field has **one document** in MongoDB that is **updated in place**. Individual observations are not stored - only the aggregated statistics. This means:
- No observation history to purge
- Constant storage per unique field regardless of observation volume
- `firstObservedAt` and `lastObservedAt` track the time range

When submitting observations:

1. **Compute identity** for each observation
2. **Lookup existing** catalog entry by identity
3. **If exists:** Update statistics in place
4. **If new:** Create catalog entry

### Statistics Merged

| Field | Merge Logic |
|-------|-------------|
| `minOccurs` | `min(existing, observation.count)` |
| `maxOccurs` | `max(existing, observation.count)` |
| `allowsNull` | `existing OR observation.hasNull` |
| `allowsEmpty` | `existing OR observation.hasEmpty` |
| `optionalMetadata` | For each key, add new value to existing Set (union) |
| `casingCounts` | Increment count for the observed casing variant |
| `lastObservedAt` | Update to current timestamp |
| `firstObservedAt` | Keep original (set on creation) |

**Optional Metadata Accumulation:** Unlike required metadata (which must match exactly for identity), optional metadata values are accumulated over time. If a field is observed with `channel=web` today and `channel=mobile` tomorrow, `optionalMetadata.channel` will contain `["web", "mobile"]`. This enables filtering to find fields observed under specific conditions.

**Casing Tracking:** While `fieldPath` is stored lowercase for identity matching, the original casing from each observation is tracked in `casingCounts`. For example, if `/Document/Account` is observed 45 times and `/document/account` is observed 3 times, `casingCounts` will be `{"/Document/Account": 45, "/document/account": 3}`. Users can then select a `canonicalCasing` for schema export - if not set, the most-observed casing is used.

**Code:** `CatalogService.mergeObservation()`, `CatalogService.accumulateOptionalMetadata()`

---

## Single-Context Cleanup

After processing a batch for a context:
- Fields NOT present in batch get `minOccurs = 0`
- This marks them as "optional" (not always present)

**Code:** `CatalogService.markAbsentFieldsAsOptional()`

---

## UI Upload Workflow

### Submit Data Page (`/submit`)

Three-step workflow:
1. **Select Context:** Choose target context
2. **Scan Files:** Drop XML files, extract observations
3. **Review & Submit:** Edit metadata, submit bins

**Key files:**
- `SubmitDataPage.tsx` - page component
- `useXmlUpload.ts` - upload state management
- `xmlParser.ts` - XML parsing logic
- `BinRow.tsx` - file group display
- `MetadataEditorModal.tsx` - metadata editing

### XML Parser Behavior

- Extracts leaf elements and attributes as field paths
- Detects `xsi:nil="true"` as null
- Detects empty string values
- Applies metadata rules from context
- Groups files by metadata values ("bins")

**Code:** `ui/src/utils/xmlParser.ts`

---

## SDK Patterns

### Fire-and-Forget

SDKs use async, non-blocking submission:
- Never blocks caller
- No retries on failure
- Silent failure if catalog unavailable

**Rationale:** Catalog must never impact legacy system performance.

### Python SDK

```python
from ceremony_catalog import CatalogClient

client = CatalogClient(base_url="http://localhost:8080")
client.submit_observations("deposits", observations)
```

**Location:** `sdks/python/`

### .NET SDK

```csharp
var client = new CatalogClient("http://localhost:8080");
await client.SubmitObservationsAsync("deposits", observations);
```

**Location:** `sdks/dotnet/net48/`

---

## Modifying Behavior

### Change Merge Logic

Edit `CatalogService.mergeObservation()`:
- Add new statistics fields
- Change aggregation logic
- Add validation

### Change XML Parsing

Edit `ui/src/utils/xmlParser.ts`:
- Add new field detection
- Change path format
- Add attribute handling

### Add New Observation Field

1. Add to `CatalogObservationDTO.java`
2. Add to `CatalogEntry.java` if persisted
3. Update merge in `CatalogService.java`
4. Update parser in `xmlParser.ts`
