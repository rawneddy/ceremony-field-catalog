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

## Out of Scope

- User-selectable casing in schema export (use dominant automatically)
- Casing tracking for metadata (already intentionally lowercase)
- Discovery tab changes (Schema tab only for now)
