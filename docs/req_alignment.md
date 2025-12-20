# Requirements Alignment Document

**Baseline Commit:** `863cbddd59f927bb71085022513eb757646f6011`
**Analysis Date:** 2025-12-19
**Purpose:** Document differences between planned implementation (REQUIREMENTS.md, IMPLEMENTATION.md) and actual implementation to enable IMPLEMENTATION.md updates.

---

## 1. Terminology & Naming Changes

| Planned Name | Actual Name | Notes |
|--------------|-------------|-------|
| QuickSearchPage | `FieldSearchPage` | Route: `/search`, file: `FieldSearchPage.tsx` |
| AdvancedSearchPage | `DiscoveryPage` | Route: `/` (home), file: `DiscoveryPage.tsx` |
| "Advanced Search" (UI label) | "Discovery Engine" | Reflects behavioral change to reactive search |
| ContextForm.tsx | `ContextFormModal.tsx` | Now a modal component |
| ContextList.tsx | Inline in `ContextsPage.tsx` | No separate list component |
| ContextDeleteDialog.tsx | `window.confirm()` | Simple browser confirm, not custom dialog |

**Route Swap:** Discovery is now the home page (`/`) and Field Search moved to `/search`. This reflects that Discovery (instant/reactive browsing) is the primary workflow, while Field Search (button-triggered) is secondary.

**File Renames Completed:** Page files renamed to match component names (`DiscoveryPage.tsx`, `FieldSearchPage.tsx`).

---

## 2. Major Feature Additions (Not in Original Plan)

### 2.1 Metadata Extraction Rules

**NEW FEATURE:** Contexts can now define XPath-based auto-extraction rules with optional regex validation.

**Backend Changes:**
- New domain class: `MetadataExtractionRule` with `xpaths: List<String>` and `validationRegex: String`
- Context now has `metadataRules: Map<String, MetadataExtractionRule>`
- Validation: XPaths must start with `/`, regex patterns validated with `Pattern.compile()`

**Frontend Changes:**
- `Context` type extended with `metadataRules: Record<string, MetadataExtractionRule>`
- `ContextFormModal` includes `MetadataRuleEditor` sub-component for editing XPath lists and regex patterns
- Real-time regex validation with visual feedback (green border for valid, red for invalid)

**API Impact:**
```json
// POST/PUT /catalog/contexts
{
  "contextId": "deposits",
  "metadataRules": {
    "productCode": {
      "xpaths": ["/Root/ProductCode", "/Ceremony/Product/@code"],
      "validationRegex": "^[A-Z]{2,4}$"
    }
  }
}
```

### 2.2 Smart Upload Workflow

**NEW FEATURE:** 3-phase upload workflow with automatic metadata extraction.

**Planned (IMPLEMENTATION.md):**
- Simple drop zone + metadata form + progress

**Actual Implementation:**
1. **Phase 1 - Context Selection:** Select target context to load extraction rules
2. **Phase 2 - File Scanning:** Drop files, auto-extract metadata using context's XPath rules
3. **Phase 3 - Bin Review:** Files grouped by extracted metadata, user can edit/confirm, then submit

**New Components/Hooks:**
- `useXmlUpload` hook with `scanFiles()`, `updateBinMetadata()`, `submitBin()`
- `BinRow` component for reviewing grouped files
- `UploadBin` type for tracking file groups with shared metadata

**Visual Workflow:**
```
[Step 1: Context] → [Step 2: Scan] → [Step 3: Review & Submit]
```

### 2.3 Observation Timestamps

**NEW FEATURE:** Fields now track when they were first and last observed.

**Backend Changes:**
- `CatalogEntry` extended with `firstObservedAt` and `lastObservedAt` timestamps

**Frontend Changes:**
- `CatalogEntry` type includes `firstObservedAt: string` and `lastObservedAt: string`
- `FieldTable` displays "First Seen" and "Last Seen" columns (sortable)

---

## 3. Behavioral Differences

### 3.1 Search Page Behavior

| Aspect | Planned | Actual |
|--------|---------|--------|
| **Quick Search** | OR-based global search | Button-triggered search with `hasSearched` flag |
| **Advanced Search** | Filter-based with Search button | **Instant/reactive** - debounced results update as you type |
| **Autocomplete trigger** | Starts on first `/` | Works on any input (simplified) |

### 3.2 Keyboard-Driven Suggestion Navigation (Field Search)

**NEW FEATURE:** Sophisticated keyboard navigation for autocomplete suggestions.

| Key | Behavior |
|-----|----------|
| **Arrow Down** | Move to next suggestion (with auto-scroll into view) |
| **Arrow Up** | Move to previous suggestion (with auto-scroll into view) |
| **Enter** | Replace input with **full** selected suggestion, but don't search yet (allows refinement) |
| **Tab** | **Partial autocomplete** - fills only up to the matched portion |

**Tab Partial Autocomplete Example:**
```
Input: "acc"
Highlighted: "/ceremony/account/balance"
After Tab: "/ceremony/acc"
```

This enables hierarchical drilling through XPath structures - Tab repeatedly to expand one level at a time, Enter when you want the full path. The implementation (lines 91-105 of FieldSearchPage.tsx):

```typescript
// Partial autocomplete: fill up to the end of the match
const matchIndex = selected.toLowerCase().indexOf(query.toLowerCase());
if (matchIndex !== -1) {
  const partial = selected.substring(0, matchIndex + query.length);
  setQuery(partial);
}
```

**Discovery Page (`DiscoveryPage.tsx`) Details:**
- No explicit "Search" button needed
- 500ms debounce on fieldPath and metadata filters
- Results update automatically as filters change
- Links to "Field Search" page for button-based searching

**Field Search Page (`FieldSearchPage.tsx`) Details:**
- Requires explicit "Search" button click
- Empty state shown until first search
- Links to "Discovery Engine" for reactive exploration

### 3.3 Context Form Behavior

| Aspect | Planned | Actual |
|--------|---------|--------|
| Form library | react-hook-form mentioned | react-hook-form **implemented** |
| Notifications | Toast mentioned | Sonner toast **implemented** |
| Required metadata editing | Read-only after creation | **Also disabled** in form |
| Delete confirmation | Custom dialog component | Browser `window.confirm()` |

### 3.4 Faceted Filtering

| Aspect | Planned | Actual |
|--------|---------|--------|
| Mode toggle | "Include any" / "Require one" | **Mode property exists** but UI toggle not visible |
| Facet popover | Detailed popover component | Simple click-to-toggle values |
| Mode-switch warning | Dialog when switching modes with multiple selections | Not implemented |
| Disjunctive counting | Described in detail | **Implemented** in `useFacets` hook |

---

## 4. Structural/Component Differences

### 4.1 Components Created (Different from Plan)

| Planned Component | Actual Implementation |
|-------------------|----------------------|
| `ContextList.tsx` | Inline in `ContextsPage.tsx` |
| `ContextCard.tsx` | **Created** as separate component |
| `ContextForm.tsx` | `ContextFormModal.tsx` (modal-based) |
| `ContextDeleteDialog.tsx` | Not created (uses `window.confirm`) |
| `FacetPopover.tsx` | Inline popover in `FacetSidebar.tsx` |
| `MetadataFacet.tsx` | Inline in `FacetSidebar.tsx` |
| `PathColumnFilter.tsx` | Not implemented |
| `ContextColumnFilter.tsx` | Not implemented |
| `ColumnFilter.tsx` | Not implemented |
| `ExportButton.tsx` | Not implemented |

### 4.2 New Components (Not in Original Plan)

| Component | Purpose |
|-----------|---------|
| `ContextFormModal.tsx` | Modal form with React Hook Form + extraction rules editor |
| `MetadataRuleEditor` | Sub-component for XPath/regex input per metadata field |
| `BinRow` | Upload page component for reviewing file groups |

### 4.3 Hooks - Planned vs Actual

| Planned Hook | Status | Notes |
|--------------|--------|-------|
| `useContexts.ts` | **Implemented** | Uses `queryKeys` factory |
| `useContextMutations.ts` | **Implemented** | Uses `queryKeys` factory |
| `useFieldSearch.ts` | **Implemented** | Accepts `scope` parameter for cache isolation |
| `useFacets.ts` | **Implemented** | Supports mode but UI simplified |
| `useSuggest.ts` | **Implemented** | Works for fieldPath suggestions |
| `useXmlUpload.ts` | **Extended** | Adds `scanFiles`, `updateBinMetadata`, `submitBin` |
| `useDebounce.ts` | **Implemented** | Used by Discovery page |

### 4.4 New Infrastructure

**Query Key Factory (`/ui/src/lib/queryKeys.ts`):**
```typescript
export const queryKeys = {
  contexts: {
    all: ['contexts'] as const,
    list: (includeCounts?: boolean) => ['contexts', { includeCounts }] as const,
  },
  fields: {
    all: ['fields'] as const,
    search: (scope: string, request: CatalogSearchRequest) => ['fields', scope, request] as const,
  },
  suggestions: {
    // ...
  },
} as const;
```

**Toast Notifications (Sonner):**
- Added `<Toaster>` to `App.tsx`
- Replaced all `alert()` calls with `toast.success()` / `toast.error()`

---

## 5. Type/Interface Differences

### 5.1 New Types

```typescript
// NEW: Metadata extraction rules
interface MetadataExtractionRule {
  xpaths: string[];
  validationRegex?: string;
}

// NEW: Upload binning
interface UploadBin {
  id: string;
  files: File[];
  metadata: Record<string, string>;
  status: 'pending' | 'submitting' | 'complete' | 'error';
  error?: string;
  progress: number;
}
```

### 5.2 Extended Types

```typescript
// Context - added metadataRules
interface Context {
  // ... existing fields
  metadataRules: Record<string, MetadataExtractionRule>;  // NEW
}

// CatalogEntry - added timestamps
interface CatalogEntry {
  // ... existing fields
  firstObservedAt: string;  // NEW
  lastObservedAt: string;   // NEW
}
```

### 5.3 Removed/Unused Types

The following types are defined but their corresponding UI features are not fully implemented:
- `FacetState.mode` - exists but mode toggle UI not visible
- `useFacetsReturn` - simplified return signature in practice

---

## 6. Features Deferred/Not Implemented

This section comprehensively lists features from REQUIREMENTS.md and IMPLEMENTATION.md that were planned but not built in the current UI.

### 6.1 Column Header Filters (REQ-3.1)

The original design called for filter controls in each column header:

| Column | Planned Filter | Current State |
|--------|----------------|---------------|
| Field Path | Text input with tooltip on hover | **Sorting only** - no filter input, no tooltip |
| Context | Multi-select checkbox dropdown (OR logic) | **Sorting only** - no dropdown |
| Min/Max | Sortable only (as planned) | **Implemented** |
| Null? | Dropdown: All/Yes/No | **Sorting only** - no dropdown |
| Empty? | Dropdown: All/Yes/No | **Sorting only** - no dropdown |

**Impact:** Users cannot filter the results table by column values. They must rely on facet sidebar for metadata filtering, but there's no way to filter by Null?/Empty? status or narrow by context within loaded results.

### 6.2 Export Functionality (REQ-3.6)

| Planned | Current State |
|---------|---------------|
| CSV/JSON format toggle (styled like String/Regex) | **Not implemented** |
| Button showing count: "Export (X of Y)" | **Not implemented** |
| Column order: contextId → fieldPath → metadata → stats | **Not implemented** |
| Export filtered subset only | **Not implemented** |

**Planned Component:** `ExportButton.tsx` was never created.

### 6.3 Facet Popover Details (REQ-3.8)

The facet system was designed with sophisticated popover controls:

| Planned Feature | Current State |
|-----------------|---------------|
| "Include any" (OR) / "Require one" (AND) mode toggle | **Mode property exists in hook** but no UI toggle visible |
| Warning dialog when switching modes with multiple selections | **Not implemented** |
| "Search values..." input when many values | **Not implemented** |
| Popover with min/max dimensions | Simple inline toggle instead |
| [Clear] button per facet | **Implemented** |
| Alphabetical value sorting | **Implemented** |

**Planned Components:** `FacetPopover.tsx` and `MetadataFacet.tsx` were never created as separate components.

### 6.4 View Mode Toggle (Future-Ready Architecture)

| Planned | Current State |
|---------|---------------|
| `FieldResults` wrapper with view toggle | Not created |
| `[Table] [Tree]` toggle (Tree disabled for v1) | **Not implemented** |
| Architecture for swapping renderers | Not built |

### 6.5 Shared FieldPathInput Component

| Planned | Current State |
|---------|---------------|
| `FieldPathInput.tsx` shared by Quick & Advanced Search | **Not created** as separate component |
| Reusable input with string/regex toggle + autocomplete | Implemented inline in each page |

### 6.6 Context Delete Confirmation Dialog (REQ-1.4)

| Planned | Current State |
|---------|---------------|
| Custom `ContextDeleteDialog.tsx` component | **Not created** |
| Styled dialog showing context name and field count | Uses `window.confirm()` instead |
| "Delete Permanently" button with warning styling | Browser native confirm |

### 6.7 Shareable URL State (IMPLEMENTATION.md)

| Planned | Current State |
|---------|---------------|
| Encode search params in URL query string | **Not implemented** |
| `contextId`, `fieldPathContains`, `regex`, metadata in URL | **Not implemented** |
| Bookmarkable/shareable search links | **Not implemented** |

### 6.8 Metadata Value Autocomplete (REQ-2.9)

| Planned | Current State |
|---------|---------------|
| Metadata filter inputs show autocomplete suggestions | **Partial** - MetadataFilters exists but autocomplete not wired |
| Scoped to selected context | Filters present but no suggestion dropdown |

### 6.9 Additional Minor Gaps

| Feature | Requirement | Current State |
|---------|-------------|---------------|
| Field Path tooltip (full path on hover) | REQ-3.1 | Not implemented - truncated paths have no tooltip |
| "Searching field paths only" hint text | REQ-2.1 | Different hint text used |
| Disjunctive counting tooltip explanation | REQ-3.8 | Header shows count but no tooltip explaining it |
| Facet "Search facets..." input if >10 keys | REQ-3.8 | Not implemented |
| Active facets pinned to top of sidebar | REQ-3.8 | Not implemented |

### 6.10 Summary: Planned Components Never Created

| Component | Purpose | What Exists Instead |
|-----------|---------|---------------------|
| `FieldPathInput.tsx` | Shared search input | Inline in each page |
| `FacetPopover.tsx` | Mode toggle + value selection | Simple inline clicks |
| `MetadataFacet.tsx` | Single facet row | Inline in FacetSidebar |
| `PathColumnFilter.tsx` | Field Path header filter | Nothing |
| `ContextColumnFilter.tsx` | Context header filter | Nothing |
| `ColumnFilter.tsx` | Null?/Empty? dropdowns | Nothing |
| `ExportButton.tsx` | CSV/JSON export | Nothing |
| `ContextDeleteDialog.tsx` | Delete confirmation | window.confirm() |
| `FieldResults.tsx` | View mode wrapper | Nothing |
| `HighlightText.tsx` | Search match highlighting | Inline in FieldTable |

---

## 7. Backend Sorting Changes

**NEW:** Backend now sorts results by field path depth (number of `/` characters) then alphabetically. This provides a natural hierarchy view without needing client-side tree rendering.

---

## 8. Recommendations for IMPLEMENTATION.md Update

### 8.1 Sections to Update

1. **Routes table:** Update to reflect route swap - Discovery at `/` (home), Field Search at `/search`
2. **Search Design:** Replace "Advanced Search" with "Discovery" terminology, document reactive vs button-triggered behavior
3. **Context Page Design:** Update to reflect modal-based form, mention React Hook Form and Sonner
4. **Upload Page Design:** Complete rewrite for 3-phase smart upload workflow
5. **Core TypeScript Interfaces:** Add `MetadataExtractionRule`, `UploadBin`, update `Context` and `CatalogEntry`
6. **Results Table Features:** Add "First Seen" and "Last Seen" columns, document timestamp display

### 8.2 New Sections to Add

1. **Metadata Extraction Rules:** Document XPath configuration, regex validation, context form integration
2. **Smart Upload Workflow:** Document 3-phase process, binning logic, auto-extraction
3. **Query Key Factory:** Document `queryKeys.ts` pattern for React Query cache management
4. **Toast Notifications:** Document Sonner integration and usage patterns
5. **Keyboard-Driven Autocomplete:** Document Arrow/Enter/Tab behavior for suggestion navigation, especially Tab partial autocomplete for hierarchical drilling

### 8.3 Sections to Mark as Deferred

1. **Column Header Filters:** Move to future enhancements
2. **Export Functionality:** Move to future enhancements
3. **Facet Mode Toggle UI:** Mark as implemented in hook but UI deferred
4. **View Mode Toggle:** Already marked as future-ready, confirm deferred

---

## 9. Commit History Since Baseline

```
af47150 feat(ui): add client-side regex validation to context form
ce368cf feat: implement smart upload workflow with metadata auto-extraction
3eceaac feat: enhance metadata extraction rules with optional validation regex
3751373 Enforces validation of metadata extraction rules
a4431b6 Fixes
7549de4 fix(tests): update ContextDefinitionDTO instantiation in tests
f0e73cf feat: implement metadata auto-extraction rules in backend
6ea161b Fixed issue with keyboard usage in suggestions box.
e43423d feat: enhance discovery with instant feed and fix field search behavior
11e8994 Updates
09b93af fix(ui): ensure side panels remain stationary during scroll
d9528d9 feat: transform discovery into real-time feed with latest-first sorting
e660c41 feat: implement discovery engine, observation timestamps, and ui refinements
5a511ee feat(ui): start fieldPath autocomplete on first '/' and update docs
9181b32 fix(ui): remove duplicate variable declaration in QuickSearchPage
2e069e5 feat(ui): implement autocomplete suggestions for search inputs
```

---

## 10. File Inventory Comparison

### Pages

| Planned | Actual | Differences |
|---------|--------|-------------|
| `QuickSearchPage.tsx` | `FieldSearchPage.tsx` | Renamed to match component, route `/search`, button-triggered |
| `AdvancedSearchPage.tsx` | `DiscoveryPage.tsx` | Renamed to match component, route `/` (home), reactive/instant |
| `ContextsPage.tsx` | `ContextsPage.tsx` | Uses extracted components, ~100 lines (was 360) |
| `UploadPage.tsx` | `UploadPage.tsx` | Complete rewrite for smart upload |

### Key Components

| Planned | Actual |
|---------|--------|
| `components/contexts/ContextList.tsx` | Not created |
| `components/contexts/ContextCard.tsx` | **Created** |
| `components/contexts/ContextForm.tsx` | `ContextFormModal.tsx` |
| `components/contexts/ContextDeleteDialog.tsx` | Not created |
| `components/search/FacetPopover.tsx` | Inline |
| `components/search/MetadataFacet.tsx` | Inline |
| `components/search/ExportButton.tsx` | Not created |

### New Files Not in Plan

| File | Purpose |
|------|---------|
| `lib/queryKeys.ts` | React Query key factory |
| `components/contexts/ContextFormModal.tsx` | Modal form with extraction rules |

---

*End of Requirements Alignment Document*
