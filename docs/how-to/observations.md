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
    Map<String, String> metadata;  // Required + optional metadata
    String fieldPath;              // XPath to field
    int count;                     // Occurrences in source
    boolean hasNull;               // Contains xsi:nil="true"
    boolean hasEmpty;              // Contains empty string value
}
```

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

---

## Merge Algorithm

**Field Identity:** `hash(contextId + requiredMetadata + fieldPath)`

When submitting observations:

1. **Compute identity** for each observation
2. **Lookup existing** catalog entry by identity
3. **If exists:** Merge statistics
4. **If new:** Create catalog entry

### Statistics Merged

| Field | Merge Logic |
|-------|-------------|
| `totalCount` | Add observation count |
| `minOccurs` | Min of existing and observation |
| `maxOccurs` | Max of existing and observation |
| `allowsNull` | OR with observation `hasNull` |
| `allowsEmpty` | OR with observation `hasEmpty` |
| `lastSeenAt` | Update to current timestamp |
| `firstSeenAt` | Keep original |

**Code:** `CatalogService.mergeObservation()`

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
