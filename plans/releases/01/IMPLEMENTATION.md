# UI Implementation

## Document Purpose

This document describes the technical implementation of the Ceremony Field Catalog UI. It implements the requirements defined in `REQUIREMENTS.md` and serves as a guide for developers working on the codebase.

---

## Summary

A React UI for the Ceremony Field Catalog, living in `ui/` folder alongside the Spring Boot API.

**Tech Stack:**
- React 18 + TypeScript + Vite
- Tailwind CSS v4 (theme in `@theme` block)
- React Query for server state
- React Router for navigation
- Sonner for toast notifications
- Lucide React for icons

**Location:** `ui/` folder at project root

**Deployment:** Separate from Spring Boot (independent deployable)

---

## Project Structure

```
ui/
├── src/
│   ├── components/
│   │   ├── ui/                    # Shared UI primitives
│   │   │   ├── ModeToggle.tsx     # String/Regex toggle button
│   │   │   ├── TagInput.tsx       # Tag/chip input with suggestions
│   │   │   ├── SuggestionInput.tsx# Text input with autocomplete
│   │   │   ├── FormField.tsx      # Form field wrapper with label
│   │   │   ├── ErrorBanner.tsx    # Error display component
│   │   │   ├── EmptyState.tsx     # Empty state with icon and message
│   │   │   ├── Skeleton.tsx       # Loading skeleton variants
│   │   │   └── index.ts           # Re-exports
│   │   ├── layout/
│   │   │   ├── Layout.tsx         # Main layout wrapper with header
│   │   │   ├── Header.tsx         # Navigation header
│   │   │   └── ErrorBoundary.tsx  # React error boundary
│   │   ├── contexts/              # Context management components
│   │   │   ├── ContextCard.tsx    # Context card with actions
│   │   │   └── ContextFormModal.tsx # Create/edit context modal
│   │   ├── search/                # Field search components
│   │   │   ├── ContextSelector.tsx    # Context dropdown
│   │   │   ├── MetadataFilters.tsx    # Tag-based metadata filters
│   │   │   ├── FacetSidebar.tsx       # Left sidebar with metadata facets
│   │   │   ├── FacetPopover.tsx       # Facet value selection popover
│   │   │   ├── TruncationWarning.tsx  # Results truncation warning
│   │   │   ├── FieldTable.tsx         # Results table with sorting
│   │   │   └── FieldDetailPanel.tsx   # Slide-out detail panel
│   │   └── upload/                # XML upload components
│   │       ├── BinRow.tsx         # File bin display with actions
│   │       └── MetadataEditorModal.tsx # Metadata editing grid modal
│   ├── hooks/
│   │   ├── useContexts.ts         # Fetch contexts (with optional counts)
│   │   ├── useContextMutations.ts # Create/update/delete contexts
│   │   ├── useFieldSearch.ts      # Search with React Query
│   │   ├── useFacets.ts           # Client-side faceted filtering
│   │   ├── useSuggest.ts          # Autocomplete suggestions
│   │   ├── useXmlUpload.ts        # File parsing and submission
│   │   ├── useDebounce.ts         # Debounce utility hook
│   │   └── index.ts               # Re-exports
│   ├── services/
│   │   ├── api.ts                 # Axios instance
│   │   ├── catalogApi.ts          # API methods
│   │   └── xmlParser.ts           # XML to observations
│   ├── lib/
│   │   └── metadataExtractor.ts   # Smart metadata extraction logic
│   ├── config.ts                  # UI configuration constants
│   ├── types/
│   │   ├── index.ts               # Re-exports
│   │   ├── catalog.types.ts       # CatalogEntry, search types
│   │   ├── context.types.ts       # Context, extraction rules
│   │   ├── upload.types.ts        # Upload bin, file types
│   │   └── facet.types.ts         # Facet state types
│   ├── utils/
│   │   └── queryKeys.ts           # React Query key factory
│   ├── pages/
│   │   ├── DiscoverFieldsPage.tsx # Home - reactive field exploration
│   │   ├── ExploreSchemaPage.tsx  # Generate exact schemas for export
│   │   ├── SubmitDataPage.tsx     # XML upload workflow
│   │   └── ManageContextsPage.tsx # Context management
│   ├── App.tsx                    # Router and providers
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Tailwind + theme (@theme block)
├── package.json
├── vite.config.ts
├── tailwind.config.js             # Content paths only
└── tsconfig.json
```

---

## Routes

| Path | Tab Name | Page | Description |
|------|----------|------|-------------|
| `/` | Discover Fields | DiscoverFieldsPage | Reactive field exploration with faceted filtering |
| `/schema` | Explore Schema | ExploreSchemaPage | Generate exact schemas for export |
| `/submit` | Submit Data | SubmitDataPage | Upload XML to extract field observations |
| `/contexts` | Manage Contexts | ManageContextsPage | Schema containers for field observations |

---

## Search Design

### Discover Fields Page (Home: `/`)

The primary search interface with reactive filtering and comprehensive options.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  DISCOVER FIELDS                                                                        │
│  Explore field patterns across schemas                                                                 │
│                                                                                         │
│  [Context ▼]  [🔍 Type anything to discover fields...        ] [String ▼]              │
│                                                                                         │
│  ┌─ Fixed Metadata Filters (when context selected) ─────────────────────────────────┐  │
│  │ productcode: [DDA ×] [SAV ×] [type...]   channel: [Online ×] [type...]           │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
├─────────────────┬──────────────────────────────────────────────────────┬───────────────┤
│                 │                                                      │               │
│  METADATA       │  Results Table                                       │  FIELD        │
│  FACETS         │                                                      │  DETAIL       │
│                 │  Field Path   │ Context │ Min │ Max │ Null │ Empty  │               │
│  Filtering 156  │  ─────────────┼─────────┼─────┼─────┼──────┼─────── │  Context:     │
│                 │  /ceremony/...│ deposits│  1  │  1  │ No   │ No     │  deposits     │
│  productcode(4) │  /ceremony/...│ deposits│  0  │  1  │ Yes  │ No     │               │
│  action    (2)  │  /ceremony/...│ loans   │  1  │  1  │ No   │ No     │  Metadata:    │
│  ──────────     │                                                      │  productcode: │
│                 │                                                      │  DDA          │
│  [Clear All]    │                                                      │               │
└─────────────────┴──────────────────────────────────────────────────────┴───────────────┘
```

**Key Features:**
- **Reactive search**: Results update automatically as user types (debounced)
- **Context selector**: Optional context filter to narrow scope
- **Tag-based metadata filters**: When context selected, shows TagInput components for each required/optional metadata field
- **Multi-value OR logic**: Each metadata field supports multiple values (chips) with OR logic within field, AND between fields
- **Facet sidebar**: Client-side faceted filtering with Include Any / Require One modes
- **Detail panel**: Click row to see full field details

**Search Behavior:**
- Search executes immediately on page load (empty query returns all results up to MAX_RESULTS_PER_PAGE)
- Text input is debounced (500ms) before triggering API call
- Metadata filter changes trigger immediately (no debounce - explicit chip add/remove)
- Context change clears all metadata filters and triggers new search
- Results always visible (no empty state before search)

**Metadata Filter Suggestions:**

When a context is selected, TagInput components appear for each required and optional metadata field. These inputs show autocomplete suggestions:

| Aspect | Behavior |
|--------|----------|
| Trigger | Focus input OR start typing |
| API Call | `GET /catalog/suggest?field=metadata.{key}&contextId={id}&prefix={text}` |
| Scope | Suggestions limited to values that exist within selected context |
| Filtering | Already-selected chips excluded from suggestions |
| Selection | Click or Enter adds chip, triggers immediate search |
| Multi-value | Multiple chips allowed per field (OR logic within field) |

**Keyboard Navigation (Metadata Filters):**

| Key | Action |
|-----|--------|
| Arrow Down | Select next suggestion |
| Arrow Up | Select previous suggestion |
| Enter | Add selected suggestion as chip → triggers search |
| Escape | Close suggestions dropdown |
| Backspace | If input empty, remove last chip → triggers search |

**Example Flow:**
```
1. User selects context "deposits" (has required: productcode, action; optional: channel)
2. Three TagInput fields appear: productcode, action, channel
3. User clicks into productcode input
4. API: /catalog/suggest?field=metadata.productcode&contextId=deposits&prefix=
5. Suggestions appear: ["dda", "sav", "cda", "mma"]
6. User types "d" → API refetches with prefix=d → ["dda"]
7. User presses Enter → "dda" chip added
8. Search triggers: /catalog/fields?contextId=deposits&metadata.productcode=dda
9. User clicks into productcode again, types "s"
10. Suggestions: ["sav"] (dda excluded - already selected)
11. User selects "sav" → second chip added
12. Search triggers: ...&metadata.productcode=dda&metadata.productcode=sav
```

**Data Flow:**
```
User types in search box
    ↓
Debounce (500ms)
    ↓
useFieldSearch hook triggers API call
    ↓
API: /catalog/fields?q=...&contextId=...&metadata.key=v1&metadata.key=v2
    ↓
Results → useFacets builds facet index
    ↓
Facet filters applied client-side
    ↓
Display filtered results
```

### Explore Schema Page (`/schema`)

A focused search interface for generating exact schemas for export.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  EXPLORE SCHEMA                                                                   │
│  Generate exact schemas for export                                                │
│                                                                                   │
│  [🔍 Search field paths...                    ] [String ▼] [Search]              │
│     ┌───────────────────┐                                                         │
│     │ /ceremony/account │  ← Suggestions dropdown (string mode only)              │
│     │ /ceremony/customer│                                                         │
│     └───────────────────┘                                                         │
├───────────────────┬───────────────────────────────────────────────────────────────┤
│                   │                                                               │
│  (Before search)  │  [Icon] Explore Schema                                        │
│                   │  Select a context to begin exploring the schema...           │
│                   │                                                               │
├───────────────────┼───────────────────────────────────────────────────────────────┤
│                   │                                                               │
│  (After search)   │  Same layout as Discover Fields with facets and results      │
│                   │                                                               │
└───────────────────┴───────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **Submit-based**: Requires clicking Search button (shake animation on empty submit)
- **Field path autocomplete**: Suggestions dropdown in string mode
- **Keyboard navigation**: Arrow keys, Enter to select, Tab to partial-complete
- **Empty state**: Shows guidance until first search executed
- **Same results layout**: Facet sidebar, table, detail panel after search

**Search Behavior:**
- No search on page load - shows empty state with guidance
- User must click Search button or press Enter to execute
- Empty query submission rejected with input shake animation
- After first search, facet sidebar and results table appear
- Subsequent searches replace results (no pagination)

**Autocomplete Behavior:**
- Suggestions appear when input is focused AND has content AND string mode active
- Suggestions fetched from `/catalog/suggest?field=fieldPath&prefix=...`
- Dropdown appears below input, scrollable if many results

**Keyboard Navigation:**
| Key | Suggestions Open | Suggestions Closed |
|-----|------------------|-------------------|
| Arrow Down | Select next suggestion | No action |
| Arrow Up | Select previous suggestion | No action |
| Enter | Fill input with selected suggestion (don't search yet) | Submit search |
| Tab | Partial autocomplete (fill to end of typed portion) | Normal tab |
| Escape | Close suggestions dropdown | No action |

**Partial Autocomplete (Tab):**
If user types `/cere` and suggestions show `/ceremony/account`, `/ceremony/customer`:
- Tab fills input to `/ceremony/` (common prefix beyond what user typed)
- User can continue typing to narrow further

### Multi-Value Metadata Filtering

The backend supports multi-value metadata parameters for OR logic:

**API Request:**
```
GET /catalog/fields?contextId=deposits&metadata.productcode=dda&metadata.productcode=sav
```

**Backend Processing:**
```java
// DynamicSearchParameterResolver.java
String[] values = webRequest.getParameterValues(paramName);
// → Map<String, List<String>> metadata

// CatalogCustomRepositoryImpl.java
if (values.size() == 1) {
    filters.add(Criteria.where("metadata." + key).is(values.get(0)));
} else {
    filters.add(Criteria.where("metadata." + key).in(values));  // OR logic
}
```

**MongoDB Query:**
```javascript
{ "metadata.productcode": { $in: ["dda", "sav"] } }
```

### Faceted Filtering

The `useFacets` hook provides client-side faceted filtering with disjunctive counting:

```typescript
interface FacetState {
  values: FacetValue[];           // Sorted alphabetically
  mode: 'any' | 'one';            // OR vs AND matching
  selected: Set<string>;          // Selected values
}

interface useFacetsReturn {
  facets: FacetIndex;             // Key → FacetState
  filteredResults: CatalogEntry[];
  setFacetMode, toggleFacetValue, clearFacet, clearAllFacets
}
```

**Disjunctive Counting Algorithm:**

Disjunctive counting shows "what would I get if I switched to this value?" by excluding each facet's own filter from its count calculation.

```
Given: results[], activeFacets = { productcode: ["dda"], action: ["fulfillment"] }

To compute counts for facet "productcode":
  1. Apply ALL other facet filters (action = "fulfillment") → subset
  2. For each unique value of productcode in subset, count occurrences
  3. Result: productcode counts reflect "if I had this productcode AND action=fulfillment"

To compute counts for facet "action":
  1. Apply ALL other facet filters (productcode = "dda") → subset
  2. For each unique value of action in subset, count occurrences
  3. Result: action counts reflect "if I had this action AND productcode=dda"
```

**Example walkthrough:**
```
Before filtering (100 results):
  productcode: dda(40), sav(35), cda(25)
  action: fulfillment(60), inquiry(40)

After selecting productcode=dda:
  productcode: dda(40), sav(35), cda(25)  ← unchanged (own filter excluded)
  action: fulfillment(30), inquiry(10)    ← updated (only dda entries)

After also selecting action=fulfillment:
  productcode: dda(30), sav(20), cda(10)  ← updated (only fulfillment entries)
  action: fulfillment(30), inquiry(10)    ← unchanged (own filter excluded)
```

**Facet Modes:**

| Mode | UI Control | Behavior |
|------|------------|----------|
| `any` (Include any) | Checkboxes | Entry matches if its value is IN selected set (OR logic) |
| `one` (Require one) | Radio buttons | Entry matches if its value EQUALS the single selected value |

Note: Backend `CatalogEntry` uses `Map<String, String>` - each entry has exactly one value per metadata key. The modes differ in UI affordance (multi-select vs single-select), not in matching semantics.

**Filter application order:**
```
API Results (server-filtered)
    ↓
useFacets receives results
    ↓
Build facet index (scan all entries, group by metadata key)
    ↓
Apply facet selections → filteredResults
    ↓
Recompute counts with disjunctive algorithm
    ↓
Display in table
```

---

## Context Management (Manage Contexts Page)

### Context Card Grid

Displays all contexts in a responsive grid with filtering:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MANAGE CONTEXTS                                                             │
│  Schema containers for field observations                                                 │
│                                                                             │
│  [🔍 Filter contexts...                                        ] [+ New]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────┐  ┌────────────────────────────────────┐ │
│  │ deposits              [Active] │  │ loans                  [Inactive] │ │
│  │ Deposit processing fields      │  │ Loan origination      (greyed)   │ │
│  │                                │  │                                   │ │
│  │ Required: productcode, action  │  │ Required: loantype, term          │ │
│  │ Optional: channel              │  │ Optional: —                       │ │
│  │                                │  │                                   │ │
│  │ 1,247 fields                   │  │ 523 fields                        │ │
│  │            [Edit]    [Delete]  │  │            [Edit]    [Delete]     │ │
│  └────────────────────────────────┘  └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Context Form Modal

Modal for creating/editing contexts with metadata extraction rules:

**Fields:**
- `contextId` (create only, read-only on edit)
- `displayName`
- `description`
- `requiredMetadata` (array, read-only on edit)
- `optionalMetadata` (array)
- `metadataRules` (per-field extraction rules with XPaths and validation regex)
- `active` (toggle)

**Extraction Rule Example:**
```typescript
metadataRules: {
  productcode: {
    xpaths: ["/Ceremony/ProductCode", "/Ceremony/@productCode"],
    validationRegex: "^[A-Z]{2,4}$"
  }
}
```

---

## Submit Data Workflow (Submit Data Page)

### Three-Step Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SUBMIT DATA                ①─────②─────③                                   │
│  Smart field extraction from XML   Context  Scan  Review                             │
├─────────────────────────────────────────────────────────────────────────────┤

Step 1: Select Context
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 SELECT CONTEXT                                                          │
│  Choose the observation point for your data                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Target Context: [Select context... ▼]                               │   │
│  │                                                                      │   │
│  │ Select a context to load its extraction rules.                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

Step 2: Scan Files
┌─────────────────────────────────────────────────────────────────────────────┐
│  📤 SCAN FILES                                                              │
│  Upload up to 25 XML files to extract field observations                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │                    [Upload Icon]                                     │   │
│  │                                                                      │   │
│  │              DROP XML FILES TO SCAN                                  │   │
│  │     We will attempt to automatically extract metadata.               │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

Step 3: Review & Submit
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✓ REVIEW & SUBMIT                                                          │
│  Verify metadata and submit observations                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Complete (3 files)                                                   │   │
│  │ productcode: DDA, action: fulfillment                               │   │
│  │ 1,247 fields • 89 attributes              [Edit] [Submit]          │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ Incomplete (2 files)                                      [Edit]    │   │
│  │ Missing required fields                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Metadata Editor Modal

Grid-based editing of metadata values per file:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EDIT METADATA - Incomplete Group                              [×]         │
│  2 files in this group                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Filename          │ productcode*    │ action*        │ channel            │
│  ──────────────────┼─────────────────┼────────────────┼──────────────────  │
│  ✓ file1.xml       │ [DDA ×]         │ [Fulfill ×]    │ [Online ×]         │
│    45 fields       │                 │                │                     │
│  ──────────────────┼─────────────────┼────────────────┼──────────────────  │
│  ○ file2.xml       │ [SAV ×]         │ [_________]    │ [_________]        │
│    32 fields       │ Required...     │ Required...    │                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [■ Required]  [■ Row complete]  2 / 2 files ready                         │
│                                                                             │
│                                              [Cancel]  [✓ Save]             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Per-row completion highlighting (green when all required fields filled)
- TagInput with single-value mode for metadata fields
- Auto-advance to next input after selection
- Save button always enabled: "Save Progress" when incomplete, glowing green "Save" when complete
- Suggestions from existing metadata values

### Smart Metadata Extraction

When files are scanned, the system attempts to auto-extract metadata values using the context's extraction rules.

**Extraction Algorithm:**
```
For each file:
  For each metadata field with rules:
    For each XPath in rules.xpaths (in order):
      1. Query XML document with XPath
      2. If value found:
         a. If validationRegex defined, test value against regex
         b. If valid (or no regex), use this value and stop
         c. If invalid, continue to next XPath
      3. If no XPath matches, field remains empty
```

**XPath Support:**
- Element paths: `/Ceremony/ProductCode` → element text content
- Attribute paths: `/Ceremony/@productCode` → attribute value
- First match wins (if multiple elements match, use first)

**Validation Regex:**
- Optional per-rule
- Applied client-side before accepting extracted value
- Invalid matches are discarded (try next XPath or leave empty)

### Bin Grouping Logic

After scanning, files are grouped into "bins" based on their metadata completeness:

**Grouping Rules:**
1. Files with ALL required metadata filled → grouped by metadata combination
2. Files missing ANY required metadata → grouped into "incomplete" bin

**Bin Identification:**
- Complete bins: ID is hash of sorted metadata key-value pairs
- Incomplete bin: ID is literal string "incomplete"

**Example:**
```
Files scanned:
  file1.xml: { productcode: "dda", action: "fulfillment" }  ✓ complete
  file2.xml: { productcode: "dda", action: "fulfillment" }  ✓ complete
  file3.xml: { productcode: "sav", action: "inquiry" }      ✓ complete
  file4.xml: { productcode: "dda" }                         ✗ missing action
  file5.xml: { }                                            ✗ missing all

Result bins:
  Bin "hash(dda+fulfillment)": [file1.xml, file2.xml]
  Bin "hash(sav+inquiry)": [file3.xml]
  Bin "incomplete": [file4.xml, file5.xml]
```

**Bin Submission:**
- Each complete bin can be submitted independently
- Incomplete bins cannot be submitted (Edit only)
- Editing metadata may move files between bins on save
- Submission calls `POST /catalog/contexts/{contextId}/observations` with merged observations

### Upload Page States

| State | Condition | Display |
|-------|-----------|---------|
| Step 1 Active | No context selected | Context dropdown enabled, steps 2-3 disabled |
| Step 2 Active | Context selected, no files | Drop zone enabled, step 1 shows checkmark |
| Scanning | Files dropped, parsing in progress | Spinner in drop zone, "Scanning Files..." |
| Step 3 Active | Files scanned | Bin list displayed, can edit/submit |
| Submitting | Bin submission in progress | Spinner on bin row, submit button disabled |
| Success | Bin submitted | Toast notification, bin shows success state |
| Error | Submission failed | Toast notification with error, bin shows error state |

---

## TagInput Component

Reusable tag/chip input with autocomplete suggestions:

```typescript
interface TagInputProps {
  field: string;                  // e.g., "metadata.productcode"
  values: string[];               // Current selected values
  onChange: (values: string[]) => void;
  contextId?: string;             // Scope suggestions to context
  placeholder?: string;
  disabled?: boolean;
  maxValues?: number;             // Limit selections (1 for single-select)
}
```

**Features:**
- Fixed positioning for dropdown (escapes overflow containers)
- Keyboard navigation: Arrow Up/Down, Enter, Backspace
- Auto-advance to next input after selection (single-value mode)
- Chips with X button for removal
- Suggestions filtered to exclude already-selected values

**Keyboard Behavior:**

| Key | Action |
|-----|--------|
| Arrow Down | Select next suggestion (with scroll into view) |
| Arrow Up | Select previous suggestion |
| Enter | Add selected suggestion as chip |
| Escape | Close suggestions, blur input |
| Backspace | If input empty, remove last chip |

**Fixed Positioning for Dropdowns:**

TagInput dropdowns must escape parent `overflow: hidden/auto` containers (common in modals). Use fixed positioning with viewport coordinate calculation:

```typescript
useEffect(() => {
  if (isFocused && containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow;

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      maxHeight: 192,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 })
    });
  }
}, [isFocused]);
```

**Auto-Advance (Single-Value Mode):**

When `maxValues={1}` and user selects a value:
1. Add chip, hide input (maxValues reached)
2. Find all TagInput containers via `[data-tag-input]` attribute
3. Find current container's index in that list
4. Focus the next container's input (if exists and not disabled)

This enables rapid keyboard-driven data entry in the metadata editor modal.

**Suggestion Scoping:**

Suggestions are fetched from `/catalog/suggest` with parameters:
- `field`: The metadata field (e.g., `metadata.productcode`)
- `prefix`: Current input text
- `contextId`: Scope to specific context (optional)

Suggestions that are already selected are filtered out before display.

---

## Page State Patterns

All pages follow consistent patterns for loading, error, and empty states.

### Loading States

| Component | Trigger | Display |
|-----------|---------|---------|
| Context grid | Initial fetch | Skeleton cards (4 placeholders) |
| Results table | Search in progress | Skeleton rows OR existing results with opacity |
| Detail panel | Never (data already loaded) | N/A |
| Upload bins | File scanning | Spinner in drop zone |

**Loading pattern:** Prefer skeleton loaders for initial loads; prefer dimmed existing content for refreshes.

### Error States

| Scope | Display | Recovery |
|-------|---------|----------|
| Page-level API error | ErrorBanner at top of content area | Retry via page refresh or new search |
| Toast notification | API mutation failure | Auto-dismiss after 5 seconds |
| Inline field error | Form validation | Clear on input change |

**ErrorBanner content:** Title (e.g., "Search Failed") + error message from API response.

### Empty States

| Page | Condition | Message |
|------|-----------|---------|
| Discover Fields | No results match filters | "No fields match your criteria. Try adjusting filters." |
| Explore Schema | Before first search | "Select a context to begin exploring the schema." |
| Explore Schema | No results | "No fields found matching your search." |
| Manage Contexts | No contexts exist | "No contexts yet. Create your first context..." |
| Manage Contexts | Filter matches nothing | "No matches. Try a different filter term." |
| Submit Data | No files scanned | (Step 2 drop zone is the empty state) |

**EmptyState component:** Icon + title + description, centered in content area.

### Results Table States

The results table has additional state considerations:

| State | Facet Sidebar | Table | Detail Panel |
|-------|---------------|-------|--------------|
| Loading (no prior results) | Hidden | Skeleton rows | Hidden |
| Loading (has prior results) | Visible | Prior results (dimmed) | Stays open if was open |
| Results (count > 0) | Visible | Data rows | Opens on row click |
| Results (count = 0) | Hidden | Empty state message | Hidden |
| Error | Hidden | Error banner | Hidden |

---

## Core TypeScript Interfaces

```typescript
// Context types
interface MetadataExtractionRule {
  xpaths: string[];
  validationRegex?: string;
}

interface Context {
  contextId: string;
  displayName: string;
  description: string | null;
  requiredMetadata: string[];
  optionalMetadata: string[];
  metadataRules: Record<string, MetadataExtractionRule>;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface ContextWithCount extends Context {
  fieldCount: number;
}

// Catalog types
interface CatalogSearchRequest {
  q?: string;
  contextId?: string;
  fieldPathContains?: string;
  metadata?: Record<string, string[]>;  // Multi-value for OR logic
  page?: number;
  size?: number;
  sort?: string;
  useRegex?: boolean;
}

interface CatalogEntry {
  id: string;
  contextId: string;
  metadata: Record<string, string>;
  fieldPath: string;
  maxOccurs: number;
  minOccurs: number;
  allowsNull: boolean;
  allowsEmpty: boolean;
  firstObservedAt: string;
  lastObservedAt: string;
}

// Upload types
interface FileWithMetadata {
  file: File;
  observations: CatalogObservation[];
  metadata: Record<string, string>;
  fieldCount: number;
  attributeCount: number;
}

interface UploadBin {
  id: string;                    // 'complete' | 'incomplete' | metadata hash
  files: FileWithMetadata[];
  status: 'pending' | 'submitting' | 'success' | 'error';
}

// Facet types
interface FacetValue {
  value: string;
  count: number;
}

interface FacetState {
  values: FacetValue[];
  mode: 'any' | 'one';
  selected: Set<string>;
}

interface FacetIndex {
  [key: string]: FacetState;
}
```

---

## UI Configuration

```typescript
// config.ts
export const config = {
  MAX_RESULTS_PER_PAGE: 250,
  DEBOUNCE_MS: 500,
  AUTOCOMPLETE_DEBOUNCE_MS: 300,
  COPY_FEEDBACK_MS: 2000,
  DETAIL_PANEL_ANIMATION_MS: 100,
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
} as const;
```

---

## Theming

Colors, fonts, and shadows are defined in `ui/src/index.css` using the Tailwind v4 `@theme` block:

```css
@theme {
  --color-paper: #F8FAFC;
  --color-ink: #0F172A;
  --color-steel: #E2E8F0;
  --color-charcoal: #1E293B;
  --color-ceremony: #0052FF;
  --color-ceremony-hover: #0043CC;
  --color-mint: #22C55E;
  --color-success: #10B981;
  --color-error-500: #EF4444;
  --font-sans: "Inter", ...;
  --font-mono: "Monaco", "Consolas", ...;
  --shadow-header: 0 8px 24px -4px rgba(15, 23, 42, 0.3);
}
```

Use via Tailwind classes: `bg-paper`, `text-ink`, `border-ceremony`, etc.

---

## Dependencies

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.x",
    "axios": "^1.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "lucide-react": "^0.x",
    "sonner": "^1.x"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.x",
    "tailwindcss": "^4.x",
    "typescript": "^5.x",
    "vite": "^5.x"
  }
}
```

---

## Requirements Traceability

### Component to Requirements Matrix

| Component | Implements Requirements |
|-----------|------------------------|
| **Context Components** | |
| `ManageContextsPage.tsx` | REQ-1.1 (view contexts) |
| `ContextCard.tsx` | REQ-1.1 (display info), REQ-1.5 (inactive styling) |
| `ContextFormModal.tsx` | REQ-1.2 (create), REQ-1.3 (edit), REQ-1.6 (extraction rules) |
| **Search Components** | |
| `DiscoverFieldsPage.tsx` | REQ-2.1 (reactive search), REQ-2.2 (context filter), REQ-2.3 (metadata filters), REQ-2.4 (mode toggle) |
| `ExploreSchemaPage.tsx` | REQ-2.5 (submit search), REQ-2.6 (autocomplete), REQ-2.7 (cross-context), REQ-2.8 (mode toggle) |
| `ContextSelector.tsx` | REQ-2.2 (context dropdown) |
| `MetadataFilters.tsx` | REQ-2.3 (tag-based filters) |
| `TagInput.tsx` | REQ-2.3 (multi-value input) |
| `ModeToggle.tsx` | REQ-2.4, REQ-2.8 (string/regex toggle) |
| **Results Components** | |
| `FieldTable.tsx` | REQ-3.1 (sortable table), REQ-3.5 (keyboard nav), REQ-3.6 (highlighting) |
| `TruncationWarning.tsx` | REQ-3.2, REQ-3.7 (truncation warning) |
| `FacetSidebar.tsx` | REQ-3.3, REQ-3.8 (faceted filtering) |
| `FacetPopover.tsx` | REQ-3.8 (mode toggle, value selection) |
| `FieldDetailPanel.tsx` | REQ-3.4 (detail panel) |
| **Submit Data Components** | |
| `SubmitDataPage.tsx` | REQ-4.1 (step workflow), REQ-4.2 (context select), REQ-4.3 (file drop) |
| `BinRow.tsx` | REQ-4.6 (bin display) |
| `MetadataEditorModal.tsx` | REQ-4.5 (metadata editing) |
| `useXmlUpload.ts` | REQ-4.4 (smart extraction), REQ-4.7 (progress) |
| **Infrastructure** | |
| `ErrorBoundary.tsx` | REQ-5.3 (error handling) |
| `ErrorBanner.tsx` | REQ-5.3 (error display) |
| `EmptyState.tsx` | REQ-5.3 (empty states) |
| `Skeleton.tsx` | REQ-5.3 (loading indicators) |

---

## Key Files Reference

| Purpose | File |
|---------|------|
| Requirements | `plans/releases/01/REQUIREMENTS.md` |
| API contract | `docs/api/API_SPECIFICATION.md` |
| Theme/colors | `ui/src/index.css` (@theme block) |
| Configuration | `ui/src/config.ts` |
| Context domain | `src/main/java/com/ceremony/catalog/domain/Context.java` |
| CORS config | `src/main/java/com/ceremony/catalog/config/WebConfig.java` |
| Suggest endpoint | `src/main/java/com/ceremony/catalog/api/CatalogController.java` |

---

## Results Table Behavior

### Column Sorting

The results table supports three-state column sorting:

| Click | State | Icon |
|-------|-------|------|
| 1st | Ascending | ▲ |
| 2nd | Descending | ▼ |
| 3rd | Original order | — |

**Sorting is client-side** on the current result set. Multi-column sort is not supported.

### Row Selection

- Click row → opens detail panel, highlights row
- Arrow keys → navigate between rows (when table focused)
- Detail panel shows all metadata key-value pairs

### Match Highlighting

When searching by pattern, matched text is highlighted:
- String mode: Literal substring highlighted
- Regex mode: Matched portion highlighted (may fail for complex patterns)

**Implementation note:** Use `String.prototype.replace()` with captured groups, not `dangerouslySetInnerHTML`. Escape HTML in field paths before highlighting.

---

## API Endpoints Used

Summary of backend endpoints the UI consumes:

### Contexts

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/catalog/contexts` | List all contexts |
| GET | `/catalog/contexts?includeCounts=true` | List with field counts |
| POST | `/catalog/contexts` | Create context |
| PUT | `/catalog/contexts/{id}` | Update context |
| DELETE | `/catalog/contexts/{id}` | Delete context and all fields |

### Catalog Fields

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/catalog/fields` | Search fields with filters |
| GET | `/catalog/fields?q={term}` | Global search (fieldPath, contextId, metadata) |
| GET | `/catalog/fields?contextId={id}&metadata.key=val` | Filtered search |
| GET | `/catalog/suggest?field={field}&prefix={text}` | Autocomplete suggestions |

### Observations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/catalog/contexts/{id}/observations` | Submit field observations |

### Search Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Global search term |
| `contextId` | string | Filter to specific context |
| `fieldPathContains` | string | Substring match on fieldPath |
| `useRegex` | boolean | Treat q/fieldPathContains as regex |
| `metadata.{key}` | string | Filter by metadata value (repeatable for OR) |
| `page` | number | Page number (0-indexed) |
| `size` | number | Results per page (max 250) |

---

## Backend Support

The following backend features support the UI:

### CORS Configuration
CORS configured for `http://localhost:5173` (Vite dev server) in `WebConfig.java`.

### Autocomplete Suggest Endpoint
`GET /catalog/suggest` supports field path and metadata value suggestions, scoped by context and metadata filters.

### Multi-Value Metadata Parameters
`DynamicSearchParameterResolver` handles repeated parameters (`metadata.key=v1&metadata.key=v2`) for OR logic.

### Context Field Counts
`GET /catalog/contexts?includeCounts=true` returns contexts with optional `fieldCount` property.

### Global Search
`GET /catalog/fields?q=term` searches fieldPath, contextId, and metadata values with OR logic.

---

## Gaps and Areas for Improvement

This section identifies features specified in requirements or identified through code review that are not yet implemented, along with technical improvements that would enhance the system.

### Unimplemented Features

| Feature | Priority | Description | Related Requirement |
|---------|----------|-------------|---------------------|
| **Export functionality** | High | CSV/JSON export of search results with all metadata columns | Originally REQ-3.6 |
| **Field path tooltips** | Low | Hover tooltip showing full path for truncated field paths in table | UX improvement |
| **Facet mode switch warning** | Low | Warning dialog when switching from "Include any" to "Require one" with multiple selections | Originally REQ-3.8 |
| **Tree view** | Future | Hierarchical display of field paths | Future enhancement |
| **Saved searches** | Future | Bookmark and share search queries via URL | Future enhancement |

### Technical Improvements

| Area | Issue | Recommendation |
|------|-------|----------------|
| **Type safety** | `optionalMetadata` can be null from API but typed as `string[]` | Update `Context` interface to use `string[] \| null` and add null guards in components |
| **Type safety** | `getContexts` always typed as `ContextWithCount[]` even without `includeCounts` | Create separate types for with/without count responses |
| **N+1 queries** | `ContextService.getAllContextsWithCounts` performs separate count query per context | Replace with grouped count aggregation query |
| **Configuration mismatch** | `max-xpath-length` in YAML vs `max-field-path-length` in properties | Align property names in `application.yml` and `CatalogProperties.java` |
| **Merge deduplication** | Duplicate observations in single batch can skew min/max stats | Pre-aggregate observations by field identity before merge |
| **Test coverage** | No UI tests, minimal controller/repository tests | Add hook/component tests, API endpoint tests for search behavior |
| **Context ID normalization** | Context endpoints accept case-sensitive IDs causing 404s | Normalize context IDs in controller endpoints |

### Performance Considerations

| Area | Current State | Improvement |
|------|---------------|-------------|
| **Metadata indexing** | Current index on `metadata` as whole object doesn't help dot-notation queries | Add wildcard index `metadata.$**` |
| **Global discovery** | Uses `$objectToArray` on metadata (inherently unindexed) | Materialized searchText field with text index |
| **Single-context cleanup** | Loads and filters full entries in memory | Use targeted query or update-by-field-path |

### Observability Gaps

| Area | Current State | Improvement |
|------|---------------|-------------|
| **Request logging** | Standard Spring logging | Add request/response logging or query timing instrumentation |
| **Performance monitoring** | Cache/performance config exists but not wired | Integrate performance configuration with runtime monitoring |
| **API versioning** | Not implemented | Add versioning plan to API spec for future evolution |
