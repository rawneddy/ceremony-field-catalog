# Plan: Field Path Casing Tracking

## Overview

Track observed field path casings with counts, display dominant casing, and allow inline expansion to view variants in the Schema tab.

**Key insight:** Keep `fieldPath` lowercase for identity/search (unchanged), but add a `casingCounts` map to track what casings were actually observed.

---

## Backend Changes

### 1. Add `casingCounts` field to CatalogEntry

**File:** `src/main/java/com/ceremony/catalog/domain/CatalogEntry.java`

```java
@Field("casingcounts")
private Map<String, Long> casingCounts;
// Keys are FULL PATHS as observed:
// {
//   "/Customer/Account/Name": 45,    // PascalCase variant
//   "/customer/account/name": 2      // lowercase variant
// }
```

### 2. Preserve original casing in observation flow

**File:** `src/main/java/com/ceremony/catalog/service/InputValidationService.java`

- Current: `validateAndCleanFieldPath()` returns lowercased path
- Change: Return a record with both original and normalized:
  ```java
  public record CleanedFieldPath(String original, String normalized) {}
  ```

### 3. Update merge logic to track casing counts

**File:** `src/main/java/com/ceremony/catalog/service/CatalogService.java`

In the merge loop:
```java
// After getting cleanedFieldPath
if (entry.getCasingCounts() == null) {
    entry.setCasingCounts(new HashMap<>());
}
entry.getCasingCounts().merge(originalCasing, 1L, Long::sum);
```

### 4. Update DTO/API response

The `CatalogEntry` returned by search endpoints will now include `casingCounts`.

---

## Frontend Changes

### 1. Update TypeScript types

**File:** `ui/src/types/catalog.types.ts`

```typescript
interface CatalogEntry {
  // ... existing fields ...
  casingCounts?: Record<string, number>;  // nullable for backward compat
}
```

### 2. Add utility functions

**File:** `ui/src/utils/casingUtils.ts` (new)

```typescript
export function getDominantCasing(casingCounts: Record<string, number> | undefined, fallback: string): string
export function getTotalObservations(casingCounts: Record<string, number> | undefined): number
export function hasMultipleCasings(casingCounts: Record<string, number> | undefined): boolean
```

### 3. Update FieldTable for Schema tab

**File:** `ui/src/components/search/FieldTable.tsx`

Changes:
- Add "Count" column showing total observations
- Display dominant casing instead of raw `fieldPath`
- Add expansion chevron/icon if multiple casings exist
- Track expanded rows: `const [expandedRows, setExpandedRows] = useState<Set<string>>()`
- Render inline sub-rows when expanded:
  - Simple display: casing string + count only (e.g., "/Customer/Account/Name (45)")
  - Indented, lighter styling to distinguish from parent row
  - No repeat of min/max/null/empty columns (redundant)

### 4. Case-insensitive filter box

**File:** `ui/src/pages/ExploreSchemaPage.tsx` (or wherever filter logic lives)

- Filter box must work case-insensitively against displayed (dominant) casing
- Matching: `dominantCasing.toLowerCase().includes(filterText.toLowerCase())`
- Highlighting: Use case-insensitive regex to find match positions in the displayed casing
  ```typescript
  // Find match position regardless of case, highlight in actual displayed text
  const regex = new RegExp(`(${escapeRegex(filterText)})`, 'gi');
  displayedPath.replace(regex, '<mark>$1</mark>');
  ```
- This ensures typing "customer" highlights "Customer" in "/Customer/Account/Name"

### 5. Update schema export

**File:** `ui/src/lib/schema/` (XSD and JSON schema generators)

- Use dominant casing for element/property names instead of lowercase `fieldPath`

---

## Data Migration

Existing entries will have `casingCounts: null`. Options:
1. **Lazy init:** Treat null as empty, start tracking on next observation
2. **Backfill:** Not possible (original casing already lost)

Recommend option 1 - new observations will populate, old entries show lowercase until re-observed.

---

## Files to Modify

| File | Change |
|------|--------|
| `CatalogEntry.java` | Add `casingCounts` field |
| `InputValidationService.java` | Return original + normalized casing |
| `CatalogService.java` | Track casing counts in merge |
| `catalog.types.ts` | Add `casingCounts` to interface |
| `FieldTable.tsx` | Display dominant casing, count column, inline expansion |
| `ExploreSchemaPage.tsx` | Case-insensitive filter + highlighting |
| `ui/src/lib/schema/*.ts` | Use dominant casing in export |

---

## Out of Scope (Stage 1)

- Casing tracking for metadata (already intentionally lowercase)
- Discovery tab changes (Schema tab only for now)

---
---

# Stage 2: Canonical Casing Selection

## Overview

Allow users to explicitly select the "canonical" casing for fields with multiple observed variants. Schema export is blocked until all casing conflicts are resolved, ensuring intentional, high-quality schema output.

---

## User Story Flow

### Scenario: First-time schema export with casing conflicts

1. **User searches in Schema tab** - selects context, fills metadata, clicks Search
2. **Results display** - fields show dominant casing, Count column shows observation totals
3. **User clicks "Export XSD"** (or JSON Schema)
4. **System checks for unresolved conflicts** - any field where:
   - `hasMultipleCasings(casingCounts) === true` AND
   - `canonicalCasing === null`
5. **Conflicts exist → Export blocked** - Resolution panel appears
6. **User resolves each conflict** - selects canonical casing for each field
7. **All resolved → Export enabled** - user clicks "Save & Export"
8. **Canonical selections persisted** - saved to database via API
9. **Schema exported** - uses canonical casing (or dominant if only one variant)

### Scenario: Subsequent exports (conflicts already resolved)

1. User searches, clicks Export
2. No unresolved conflicts → export proceeds immediately
3. Previously-selected canonical casings are used

### Scenario: Changing a canonical selection

1. User expands a row in Schema tab to see casing variants
2. Current canonical is marked with checkmark
3. User clicks "make canonical" on a different variant
4. Selection updates immediately (API call to persist)
5. Or user clicks "clear" to remove canonical → field becomes unresolved again

### Scenario: New casing variant observed after canonical was set

1. New XML uploaded with different casing for a field
2. `casingCounts` updated with new variant
3. `canonicalCasing` remains unchanged (user's choice preserved)
4. User can see new variant in expansion, change canonical if desired

---

## Data Model Changes

### CatalogEntry (Backend)

```java
@Field("canonicalcasing")
private String canonicalCasing;  // null = unresolved, string = user's selection
```

### CatalogEntry (Frontend)

```typescript
interface CatalogEntry {
  // ... existing fields ...
  casingCounts?: Record<string, number>;
  canonicalCasing?: string | null;  // user-selected canonical casing
}
```

---

## API Changes

### New Endpoint: Set Canonical Casing

```
PATCH /catalog/fields/{fieldId}/canonical-casing

Request:
{
  "canonicalCasing": "/Customer/Account/Name"  // or null to clear
}

Response:
200 OK - updated CatalogEntry
400 Bad Request - casing not in casingCounts
404 Not Found - field not found
```

---

## UI Components

### 1. Casing Resolution Panel (Modal/Slide-out)

Triggered when user clicks Export and unresolved conflicts exist.

```
┌─ Resolve Casing Before Export ────────────────────────┐
│                                                       │
│ 3 fields have multiple observed casings.              │
│ Select the canonical casing for each to proceed.      │
│                                                       │
│ ┌─────────────────────────────────────────────────┐   │
│ │ /customer/account/name                          │   │
│ │   ○ /Customer/Account/Name (42)                 │   │
│ │   ○ /customer/account/name (3)                  │   │
│ └─────────────────────────────────────────────────┘   │
│                                                       │
│ ┌─────────────────────────────────────────────────┐   │
│ │ /order/totalamount                              │   │
│ │   ○ /Order/TotalAmount (89)                     │   │
│ │   ○ /order/totalamount (7)                      │   │
│ └─────────────────────────────────────────────────┘   │
│                                                       │
│ [Auto-select Dominant]  [Save & Export]  [Cancel]     │
│                                                       │
│ ⚠ 2 of 3 fields still need selection                  │
└───────────────────────────────────────────────────────┘
```

**Behaviors:**
- Radio buttons for each variant
- "Auto-select Dominant" picks highest-count for all unresolved
- "Save & Export" disabled until all resolved
- Selections saved to DB, then export proceeds

### 2. Inline Canonical Selection (in FieldTable expansion)

When a row is expanded to show casing variants:

```
/Customer/Account/Name (45 total)  ✓
  └─ /Customer/Account/Name (42)  ✓ canonical        [clear]
  └─ /customer/account/name (3)     [make canonical]
```

**Behaviors:**
- "make canonical" → API call, updates immediately
- "clear" → removes canonical, field becomes unresolved
- Checkmark indicates current canonical
- Parent row shows ✓ if canonical is set

### 3. Export Button State

```typescript
// In SchemaExportButtons.tsx
const hasUnresolvedConflicts = entries.some(
  e => hasMultipleCasings(e.casingCounts) && !e.canonicalCasing
);

// If conflicts, show resolution panel instead of exporting
onClick={() => {
  if (hasUnresolvedConflicts) {
    setShowResolutionPanel(true);
  } else {
    handleExport();
  }
}}
```

---

## Implementation Plan

### Backend

| File | Change |
|------|--------|
| `CatalogEntry.java` | Add `canonicalCasing` field |
| `CatalogController.java` | Add `PATCH /fields/{id}/canonical-casing` endpoint |
| `CatalogService.java` | Add `setCanonicalCasing(fieldId, casing)` method |
| `CatalogRepository.java` | (no change - uses existing save) |

### Frontend

| File | Change |
|------|--------|
| `catalog.types.ts` | Add `canonicalCasing` to interface |
| `casingUtils.ts` | Add `getDisplayCasing()` that prefers canonical over dominant |
| `FieldTable.tsx` | Show canonical indicator, add make/clear actions |
| `CasingResolutionPanel.tsx` | New component for bulk resolution |
| `SchemaExportButtons.tsx` | Check for conflicts, show resolution panel |
| `useSetCanonicalCasing.ts` | New hook for API call |

---

## Display Logic Summary

```typescript
function getDisplayCasing(entry: CatalogEntry): string {
  // 1. If canonical is set, use it
  if (entry.canonicalCasing) {
    return entry.canonicalCasing;
  }
  // 2. Otherwise use dominant (highest count)
  return getDominantCasing(entry.casingCounts, entry.fieldPath);
}

function needsResolution(entry: CatalogEntry): boolean {
  return hasMultipleCasings(entry.casingCounts) && !entry.canonicalCasing;
}
```

---

## Edge Cases

1. **Canonical casing not in casingCounts** - Shouldn't happen normally, but API should validate. If detected, treat as unresolved.

2. **Only one casing observed** - No conflict, no resolution needed. Use that casing.

3. **casingCounts is null (legacy data)** - No conflict possible. Use lowercase fieldPath.

4. **User clears canonical, then exports** - Must re-resolve before export.

5. **Concurrent edits** - Last write wins. Acceptable for this use case.
