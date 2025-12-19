# UI First Release Implementation Plan

## Document Purpose

This document provides the technical implementation plan for the Ceremony Field Catalog UI. It implements the requirements defined in `REQUIREMENTS.md`. See the "Requirements Traceability" section at the end for mapping between components and requirements.

**Related documents:**
- `planning/DECISIONS.md` - Pre-implementation review resolution and design decisions
- `planning/ROADMAP.md` - Future enhancements (not part of initial buildout)

## Summary

Build a React UI for the Ceremony Field Catalog, living in `ui/` folder alongside the Spring Boot API.

## Decisions Made
- **Scope**: Field search/browse + Context CRUD + XML Upload with parsing
- **Tech Stack**: React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS + React Query
- **Location**: `ui/` folder at project root
- **Deployment**: Separate from Spring Boot (independent deployable)
- **Testing**: Basic coverage (unit tests for hooks/services)
- **Theme**: Navy blue corporate-minimalist (similar to US Bank)
- **XML Parsing**: TypeScript implementation in frontend (ported from Python SDK)

---

## Project Structure

```
ui/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components (button, input, table, etc.)
│   │   ├── layout/
│   │   │   ├── Layout.tsx         # Main layout wrapper
│   │   │   ├── Header.tsx         # Nav with Search/Contexts/Upload links
│   │   │   └── ErrorBoundary.tsx
│   │   ├── contexts/              # Context CRUD components
│   │   │   ├── ContextList.tsx
│   │   │   ├── ContextCard.tsx
│   │   │   ├── ContextForm.tsx
│   │   │   └── ContextDeleteDialog.tsx
│   │   ├── search/                # Field search components
│   │   │   ├── QuickSearchForm.tsx   # Global search (uses FieldPathInput)
│   │   │   ├── AdvancedSearchForm.tsx # Context + metadata + fieldPath filters
│   │   │   ├── ContextSelector.tsx    # Single-select context dropdown
│   │   │   ├── MetadataFilters.tsx   # Dynamic filters with autocomplete
│   │   │   ├── FieldPathInput.tsx    # Shared input: string/regex toggle + autocomplete (used by Quick & Advanced)
│   │   │   ├── FacetSidebar.tsx      # Left sidebar with ONLY metadata facets (collapsible, scrollable)
│   │   │   ├── MetadataFacet.tsx     # Single facet row with popover for value selection
│   │   │   ├── FacetPopover.tsx      # Popover: "Include any"/"Require one" mode + values with search
│   │   │   ├── ColumnFilter.tsx      # Filter components for table column headers
│   │   │   ├── PathColumnFilter.tsx  # Text input filter for Field Path column header
│   │   │   ├── ContextColumnFilter.tsx # Dropdown filter for Context column header
│   │   │   ├── TruncationWarning.tsx # Warning banner when results exceed max
│   │   │   ├── FieldResults.tsx      # Wrapper with view toggle (Table/Tree)
│   │   │   ├── FieldTable.tsx        # Fixed columns (no metadata), sortable, keyboard nav
│   │   │   ├── FieldRow.tsx          # Clickable with highlight state + copy btn
│   │   │   ├── FieldDetailPanel.tsx  # Slide-out detail panel (shows all metadata)
│   │   │   ├── HighlightText.tsx     # Highlights search matches in text
│   │   │   └── ExportButton.tsx      # CSV/JSON export (all or filtered)
│   │   └── upload/                # XML upload components
│   │       ├── FileDropZone.tsx   # Drag-and-drop multi-file zone
│   │       ├── MetadataForm.tsx   # Dynamic metadata inputs with autocomplete
│   │       ├── UploadProgress.tsx # Progress bar and file status
│   │       └── UploadResults.tsx  # Summary of observations submitted
│   ├── hooks/
│   │   ├── useContexts.ts         # Fetch contexts (with optional includeCounts)
│   │   ├── useContextMutations.ts # Create/update/delete
│   │   ├── useFieldSearch.ts      # Search (single page, max results per config)
│   │   ├── useFacets.ts           # Build facet index from results (metadata only), manage facet state, disjunctive counting
│   │   ├── useSuggest.ts          # Autocomplete for fieldPath and metadata
│   │   ├── useXmlUpload.ts        # Handle file parsing and submission
│   │   └── useDebounce.ts
│   ├── services/
│   │   ├── api.ts                 # Axios instance
│   │   ├── catalogApi.ts          # API methods
│   │   └── xmlParser.ts           # XML to observations (ported from Python)
│   ├── config.ts                  # UI configuration constants (see REQUIREMENTS.md)
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   ├── pages/
│   │   ├── QuickSearchPage.tsx    # Home page - global OR search
│   │   ├── AdvancedSearchPage.tsx # Filter-based AND search
│   │   ├── ContextsPage.tsx       # Context management
│   │   └── UploadPage.tsx         # XML upload page
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── tests/
│   ├── hooks/useFieldSearch.test.ts
│   ├── services/catalogApi.test.ts
│   └── services/xmlParser.test.ts # Critical - test XML parsing logic
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | QuickSearchPage | Quick Search - global OR-based search (home) |
| `/search` | AdvancedSearchPage | Advanced Search - filter-based AND search |
| `/contexts` | ContextsPage | Context list with CRUD |
| `/upload` | UploadPage | XML file upload with parsing |

---

## Search Design (Two Separate Views)

The UI provides two distinct search views optimized for different use cases.

### Full 3-Panel Layout

When a result row is selected, the complete layout shows all three panels:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🔍 [Amount____________________] [String ▼] [Search]                    [Advanced Search →]        │
├────────────────┬───────────────────────────────────────────────────────────────┬───────────────────┤
│                │                                                               │                   │
│  METADATA      │  Results (23 of 250)                        [Export (23)]    │  METADATA DETAIL  │
│  FACETS        │                                                               │                   │
│  (Filter)      │  ┌───────────────────┬──────────┬─────┬─────┬──────┬───────┐ │  Context:         │
│                │  │ Field Path    ↕   │ Context↕ │Min↕ │Max↕ │Null?↕│Empty?↕│ │  deposits         │
│  Filtering 23  │  │ [🔍 ___________]  │ [☑All ▼] │     │     │  ▼   │  ▼    │ │   (multi-select)  │
│                │  ├───────────────────┼──────────┼─────┼─────┼──────┼───────┤ │  Metadata:        │
│  productCode(4)│  │ /ceremony/ac/amt  │ deposits │  1  │  1  │ No   │ No    │ │  productCode: DDA │
│  action    (2) │  │ /ceremony/cu/id   │ loans    │  0  │  1  │ Yes  │ No    │ │  action: Fulfill  │
│                │  │►/ceremony/rq/type │ ondemand │  1  │  1  │ No   │ No    │◄│                   │
│  ────────────  │  └───────────────────┴──────────┴─────┴─────┴──────┴───────┘ │  Statistics:      │
│                │                                                               │  Occurs: 1-1      │
│  [Clear All]   │                                                               │  Null: No         │
│                │                                                               │  Empty: No        │
│                │                                                               │                   │
│                │                                                               │                   │
│                │                                                               │                   │
└────────────────┴───────────────────────────────────────────────────────────────┴───────────────────┘
       ↑                                       ↑                                         ↑
   LEFT SIDEBAR                             TABLE                                   RIGHT PANEL
   Metadata FILTER                   Data + Column Filters                        Metadata DETAIL
```

**Design principle:** Clean separation of concerns:
- **Left sidebar** = Filter by metadata values (not visible in table columns)
- **Table column headers** = Filter by column values (Field Path, Context, Null?, Empty?)
- **Right detail panel** = View complete metadata for selected row

### Quick Search View (Home Page: `/`)

Simple global search across field paths and contexts using OR logic.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🔍 Search fields or contexts...                                                 │
│  [Amount_______________________________] [String ▼] [Search]  [Advanced Search →]│
│  ↳ Searching all values (start with / for field paths)    ← hint text           │
├───────────────────┬──────────────────────────────────────────────────────────────┤
│                   │                                                              │
│ [≡] METADATA      │  Results (23 of 250)                       [Export (23)]    │
│ Filtering 23      │                                                              │
│                   │  ┌─────────────────────────┬───────────┬─────┬─────┬──────┬──────┐
│ productCode ● 2/4 │  │ Field Path          ↕   │ Context ↕ │Min ↕│Max ↕│Null?↕▼│Empty?↕▼
│ action        (2) │  │ [🔍 _________________ ] │ [☑All  ▼] │     │     │      │      │
│                   │  ├─────────────────────────┼───────────┼─────┼─────┼──────┼──────┤
│ ────────────────  │  │ /ceremony/account/amt   │ deposits  │  1  │  1  │ No   │ No   │
│                   │  │ /ceremony/customer/id   │ loans     │  0  │  1  │ Yes  │ No   │
│ [Clear All]       │  │ /ceremony/request/type  │ ondemand  │  1  │  1  │ No   │ No   │
│                   │  └─────────────────────────┴───────────┴─────┴─────┴──────┴──────┘
└───────────────────┴──────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Single search input with placeholder "Search fields or contexts..."
- Uses `?q=` parameter for global OR search

**String Mode (default):**
- Without `/` at start: Searches ALL values (contextId, fieldPath, metadata values) using OR logic. No autocomplete suggestions.
- With `/` at start: Activates fieldPath-only search mode with autocomplete. Shows hint text below input: "Searching field paths only".
- Example: `Amount` matches entries where any value contains "Amount"
- Example: `/ceremony/account` matches only fieldPath with autocomplete

**Regex Mode:**
- Applies to everything (contextId, fieldPath, metadata values)
- No special `/` handling - users construct regex patterns naturally
- No autocomplete suggestions

**Common:**
- Results table shows: Field Path, Context, Min, Max, Null?, Empty? (no metadata columns)
- Facet sidebar on left for client-side refinement of loaded results
- Link to Advanced Search for server-side metadata filtering
- Click row → Side panel shows full details including all metadata key-value pairs

### Advanced Search View (`/search`)

Filter-based search with AND logic for precise queries. Adds server-side metadata filtering on top of Quick Search capabilities.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Context: [Select context...        ▼]                                           │
│           ↑ single-select dropdown (no selection = all active contexts)          │
│                                                                                  │
│  ┌─ Metadata Filters (shown when context selected) ───────────────────────────┐  │
│  │ productCode: [DDA____▼]  productSubCode: [____]  action: [Fulfillment▼]    │  │
│  │              ↑ autocomplete (scoped to context)                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  Field Path: [/Ceremony/Acc____] [String ▼] [🔍]                                 │
│                    ↑ autocomplete (scoped to context + metadata if selected)     │
├───────────────────┬──────────────────────────────────────────────────────────────┤
│                   │                                                              │
│ [≡] METADATA      │  Results (156 of 250)              [Export (156)]            │
│ Filtering 156     │                                                              │
│                   │  ┌─────────────────────────┬───────────┬─────┬─────┬──────┬──────┐
│ productCode ● 1/4 │  │ Field Path          ↕   │ Context ↕ │Min ↕│Max ↕│Null?↕▼│Empty?↕▼
│ action        (2) │  │ [🔍 _________________ ] │ [☑All  ▼] │     │     │      │      │
│                   │  ├─────────────────────────┼───────────┼─────┼─────┼──────┼──────┤
│ ────────────────  │  │ /ceremony/account/amt   │ deposits  │  1  │  1  │ No   │ No   │
│                   │  │ /ceremony/account/type  │ deposits  │  1  │  1  │ No   │ No   │
│ [Clear All]       │  │ /ceremony/account/id    │ deposits  │  0  │  1  │ Yes  │ No   │
│                   │  └─────────────────────────┴───────────┴─────┴─────┴──────┴──────┘
└───────────────────┴──────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Context single-select dropdown with active contexts only (no selection = search all active contexts)
- When context selected: show metadata filter inputs for that context (server-side filtering)
- When no context selected: hide metadata filters, show results from all active contexts
- All server-side filters combine with AND logic
- FieldPath filter supports string/regex toggle (see REQ-2.11)
- FieldPath autocomplete when input starts with `/` (scoped to context + metadata if selected)
- Metadata value autocomplete (scoped to selected context)
- Results table shows: Field Path, Context, Min, Max, Null?, Empty? (no metadata columns)
- Facet sidebar on left for additional client-side refinement of loaded results
- Click row → Side panel shows full details including all metadata key-value pairs

### Results Interaction Features

**Single Page Results (POC Simplification)** - The UI requests `size=MAX_RESULTS_PER_PAGE` for all searches (see `config.ts`). The backend `max-page-size` must be aligned. No pagination controls. This keeps the POC simple while still being useful.

**Truncation Warning Banner** - When results are truncated (total > `MAX_RESULTS_PER_PAGE`), display a prominent warning banner above the results table:
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  Showing 250 of 1,847 results.                           │
│     Please refine your search to see all matches.           │
└─────────────────────────────────────────────────────────────┘
```
- Use warning colors (yellow/amber background) to ensure visibility
- Display total count from API response (`page.totalElements`)
- Position above results table, below search form
- Should be impossible to miss - this prevents user frustration in Phase 1

**Keyboard Navigation:**
- Click row → highlight it, show detail panel on right
- Arrow keys (↑/↓) navigate between rows instantly
- Selected row stays highlighted, detail panel updates

### Client-Side Filtering Pipeline

When results load from the API, client-side filtering happens in a defined order:

```
API Results (server-side filtered)
    │
    ▼
Column Filters (Field Path text, Context multi-select, Null?/Empty? dropdowns)
    │
    ▼
Sidebar Facets (metadata only, managed by useFacets hook)
    │
    ▼
Final Display (filtered results shown in table)
```

**Key principle:** The `useFacets` hook receives results AFTER column filters are applied. This ensures:
- Facet counts reflect the column-filtered "universe" of results
- Column filters and facets work together seamlessly
- Disjunctive counting is computed correctly

**Reset behavior:** When ANY server-side filter changes (context, metadata, fieldPath in Advanced Search):
1. Execute API call
2. On results arrival: Reset ALL client-side filters to defaults
   - Column filters: Field Path = empty, Context = all selected, Null?/Empty? = All
   - Sidebar facets: Clear all selections
3. Recompute facet index from new results

### Server-Side vs Client-Side Filtering

The search system has two filtering layers with distinct purposes:

| Filter | Location | Rationale |
|--------|----------|-----------|
| Context (single-select) | Server-side (Advanced Search) | Determines which metadata fields to show, reduces data volume significantly |
| Metadata values | Server-side (Advanced Search) | Uses indexes, reduces data volume |
| FieldPath pattern (string/regex) | Server-side (search form) | Uses indexes, can match millions of records |
| Faceted metadata filtering | Client-side (left sidebar) | Drill into metadata distribution of loaded results |
| Field Path text filter | Client-side (table column header) | Instant text match on fieldPath |
| Context dropdown | Client-side (table column header) | Filter by context from loaded results |
| Null?/Empty? dropdowns | Client-side (table column headers) | Filter by All/Yes/No per column |

**Key distinction:**
- **Server-side**: Changes the API request, uses database indexes, affects what data is fetched
- **Client-side**: No API call, instant show/hide of already-loaded rows

### Faceted Metadata Filtering (Left Sidebar)

The left sidebar provides powerful client-side filtering using a faceted search pattern (similar to Splunk, Elasticsearch, or e-commerce sites). This allows users to drill into the metadata distribution of their search results.

**Sidebar Layout (Metadata Facets Only):**
```
┌──────────────────────┐
│ [≡] METADATA FACETS  │  ← collapse toggle
│ Filtering 156 loaded │  ← count with tooltip: "Counts based on loaded results (max 250)"
│                      │
│ [Search facets...]   │  ← shown if > 10 metadata keys
│                      │
│ productCode ●    2/4 │  ← active facets pinned to top
│ ──────────────────── │
│ action           (2) │
│ loanType         (5) │
│ channel          (3) │
│                      │
│ [Clear All Filters]  │
└──────────────────────┘
```

**Design principle:** The sidebar contains ONLY metadata facets. Table columns (Field Path, Context, Null?, Empty?) have their own filters in column headers. This creates a clean separation:
- **Sidebar** = Filter by metadata values (not visible in table)
- **Column headers** = Filter by column values (visible in table)
- **Detail panel** = View all metadata for selected row

**Note:** Property filters (Has null, Has empty, Optional, Repeating) are now in table column headers (Null? and Empty? columns have filter dropdowns). Min/Max columns are sortable to find optional (minOccurs=0) or repeating (maxOccurs>1) fields.

**How it works:**
1. When results load, scan all entries to build a facet index
2. Show all **metadata keys** present in the result set (NOT contextId - that's a column header filter)
3. Facet values sorted alphabetically (A-Z)
4. Active facets pinned to top of list
5. Each key displays the count of distinct values: `productCode (4)`
6. When a filter is active, show: `productCode ● 2/4` (2 of 4 values selected)
7. Clicking a key opens a popover for value selection

**Facet Popover (opens on click):**
```
╭─────────────────────────────────╮  ← min-width: 220px, max-width: 350px
│ productCode                     │
│                                 │
│ ○ Include any                   │  ← multi-select mode (OR)
│ ● Require one                   │  ← single-select mode (AND)
│ ─────────────────────────────── │
│ [Search values...]              │  ← shown if many values
│ ─────────────────────────────── │  ↓ max-height: 300px with scroll
│ ( ) CDA (15)                    │  ← alphabetical order
│ (●) DDA (28)                    │  ← selected value
│ ( ) MMA (5)                     │
│ ( ) SAV (12)                    │
│ ─────────────────────────────── │
│ [Clear]                         │  ← clears only this facet
╰─────────────────────────────────╯
```

**Match Modes:**

| Mode | UI | Behavior | Use Case |
|------|-----|----------|----------|
| **Include any** | Checkboxes | Include entries matching ANY checked value (OR logic) | "Show me DDA or CDA entries" |
| **Require one** | Radio buttons | Include entries matching the ONE selected value | "Show me only CDA entries" |

**Data model note:** Backend `CatalogEntry` uses `Map<String, String>` - each entry has exactly ONE value per metadata key. Therefore:
- "Require one" = entry's single value must equal the selected value
- "Include any" = entry's single value must be in the selected set

**Mode switching behavior:**

When switching from "Include any" → "Require one" with multiple values selected:

```
┌─ Switch Mode? ─────────────────────────────────┐
│                                                 │
│ ⚠️ This will clear your selections.            │
│                                                 │
│ "Require one" allows only a single value.      │
│ Your 3 selected values will be cleared.        │
│                                                 │
│              [Cancel]  [Clear & Switch]        │
└─────────────────────────────────────────────────┘
```

- If user clicks **Cancel**: Stay in "Include any" mode, keep selections
- If user clicks **Clear & Switch**: Clear all selections, switch to "Require one" mode

When switching "Require one" → "Include any": No warning needed, just switch. The single selected value becomes the first checkbox selection.

**Cross-key logic:**
All metadata key filters combine with AND logic:
- `productCode IN (DDA, CDA) AND action = Fulfillment` in "Include any" mode for productCode
- `productCode = CDA AND action = Fulfillment` in "Require one" mode for productCode

**Disjunctive counting (Splunk-style):**

Counts are computed using disjunctive faceting - the current facet's own filter is excluded from its count calculation, while other filters apply. This shows "what would I get if I switched to this value?"

**Algorithm for facet key K:**
1. Start with column-filtered results (after Field Path, Context, Null/Empty filters applied)
2. Apply ALL facet filters EXCEPT K's filter
3. Count distinct values of metadata key K in that result set
4. Display these counts next to K's values

**Example walkthrough:**
```
Before filtering:                After selecting productCode = DDA:
│ productCode      (4) │         │ productCode  ●   1/4 │  ← counts stay at 4 (disjunctive: own filter excluded)
│ action           (3) │    →    │ action           (2) │  ← updated: only 2 actions in DDA entries
│ channel          (2) │         │ channel          (1) │  ← updated: only 1 channel in DDA entries
```

After also selecting action = Fulfillment:
```
│ productCode  ●   1/4 │  ← still 4 (excludes productCode filter, applies action filter)
│ action       ●   1/2 │  ← still 2 (excludes action filter, applies productCode filter)
│ channel          (1) │  ← 1 (applies BOTH productCode AND action filters)
```

**Special case - "Include any" (OR) mode with multiple selections:**
If user selects productCode IN [DDA, CDA] (multiple values in Include any mode):
- Filter applied to OTHER facets: entry.productCode IN [DDA, CDA]
- productCode facet itself: Counts all 4 values (own filter excluded)

**Instant apply:**
- Changes take effect immediately (no "Apply" button needed)
- Popover stays open until user clicks outside
- Results update in real-time as selections change

### Results Table Features

**Fixed columns (no metadata columns):**
- Field Path (sortable)
- Context (sortable)
- Min Occurs (sortable) - sort ascending to find optional fields (minOccurs=0)
- Max Occurs (sortable) - sort descending to find repeating fields (maxOccurs>1)
- Allows Null? (sortable + filter dropdown: All/Yes/No)
- Allows Empty? (sortable + filter dropdown: All/Yes/No)

Metadata values are shown in the detail panel only, not in the table. This ensures the table scales regardless of how many contexts or metadata fields exist.

**Column header filters:**
```
┌─────────────────────────────┬─────────────────┬───────┬───────┬──────────┬──────────┐
│ Field Path              ↕   │ Context     ↕   │ Min ↕ │ Max ↕ │ Null? ↕▼ │ Empty? ↕▼│
│ [🔍 ____________________ ]  │ [☑ All      ▼]  │       │       │ ○ All    │ ○ All    │
│ (hover for full path)       │ ☑ deposits      │       │       │ ○ Yes    │ ○ Yes    │
│                             │ ☑ loans         │       │       │ ○ No     │ ○ No     │
│                             │ ☐ ondemand      │       │       │          │          │
└─────────────────────────────┴─────────────────┴───────┴───────┴──────────┴──────────┘
```

| Column | Filter Type | Rationale |
|--------|------------|-----------|
| Field Path | Text input + **tooltip** | Many unique values, text search needed. **Hover shows full path** for truncated values. |
| Context | **Multi-select checkbox dropdown** | Allows OR logic (show deposits AND loans). Default: all selected. No counts shown. |
| Min | Sortable only | Sort ascending to find optional (minOccurs=0) |
| Max | Sortable only | Sort descending to find repeating (maxOccurs>1) |
| Null? | Dropdown (All/Yes/No) + sortable | Boolean filter, sortable to group Yes/No |
| Empty? | Dropdown (All/Yes/No) + sortable | Boolean filter, sortable to group Yes/No |

**Note:** All columns are sortable with three-state toggle: ascending → descending → original order.

**Field Path tooltip:** When field paths are long, they truncate with `...` in the table cell. Hovering over any Field Path cell shows a tooltip with the complete path. Copy button on row copies the full path.

**Sortable columns:**
- Click column header → sort ascending
- Click again → sort descending
- Click again → return to original order
- Works on all columns (string, number, boolean)

**Highlight Matching Text:**
- When searching by fieldPath pattern, highlight the matched portion in results
- Example: search "Amount" → displays "/Ceremony/Account/Fee/**Amount**" with "Amount" highlighted
- Uses `<mark>` tag or styled `<span>` for highlight
- Works with both Quick Search and Advanced Search fieldPath filter

### Field Detail Panel (Slide-out)

Shows context, all metadata, and statistics for the selected row. Field path is already visible in the selected table row, so it's not repeated here.

```
┌─ Field Details ─────────────────────────────────┐
│ Context: deposits                               │
│                                                 │
│ Metadata:                                       │
│   productCode: DDA                              │
│   productSubCode: 4S                            │
│   action: Fulfillment                           │
│                                                 │
│ Statistics:                                     │
│   Occurrences: 0-5 per document                 │
│   Allows null: Yes                              │
│   Allows empty: No                              │
└─────────────────────────────────────────────────┘
```

### Additional Search Page Features

**Copy Field Path:**
- Copy button on each table row (icon)
- Copies full fieldPath to clipboard
- Toast notification: "Copied to clipboard"

**Export Results:**
```
┌─ Export ─────────────────────────────────────────┐
│ Format: [CSV | JSON]     ← toggle styled like String/Regex
│                                                  │
│ [⬇ Export (12 of 247)]   ← shows filtered count │
└──────────────────────────────────────────────────┘
```
- CSV or JSON format toggle (styled like String/Regex toggle)
- Button shows count: "Export (X of Y)" when filters active, "Export (X)" when not
- Exports filtered subset only when filters are active
- Column order: contextId → fieldPath → metadata keys (A-Z) → minOccurs → maxOccurs → allowsNull → allowsEmpty
- **Note:** Export includes all metadata fields even though table doesn't show them
- Download triggers browser file save

**View Mode (Future-Ready):**
- Results wrapped in `FieldResults` component
- Contains view toggle: `[Table] [Tree]` (Tree disabled for v1)
- Architecture allows swapping between `FieldTable` and `FieldTree` renderers
- Tree view would show hierarchical path structure (future enhancement)

### Page States (REQ-5.3)

Each page should handle these states:

| State | When | UX Pattern |
|-------|------|------------|
| **Loading** | API request in progress | Loading indicator (spinner, skeleton, or similar) |
| **Empty** | No results / no data | Friendly message with guidance (e.g., "No fields found. Try a different search.") |
| **Error** | API failure | Error message with option to retry |
| **Success** | Data loaded successfully | Display the content |

Apply these patterns per page:
- **Search pages**: Loading during search, empty when no results match, error if API fails
- **Context list**: Loading on initial fetch, empty if no contexts exist, error if API fails
- **Upload page**: Loading during parse/submit, error if submission fails, success summary on completion

**Zero-results from facet filtering:**
When client-side facet filters narrow results to zero:
- Keep the facet sidebar visible with active filters highlighted
- Show message: "No results match current filters"
- User can undo filters to see results again
- [Clear All Filters] button prominently visible

**New server-side search clears facets:**
When user changes server-side filters (context, metadata, fieldPath) and new results load:
1. Fetch new results from API
2. Clear all active facet filters
3. Rebuild facet index from new result set
4. User can now facet-filter the new results

---

## Context Page Design

### Context List View

```
┌─────────────────────────────────────────────────────────────┐
│ Contexts                                    [+ New Context] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ deposits                              [Active ✓] [Edit] │ │
│ │ Deposit processing fields                               │ │
│ │ Required: productCode, productSubCode, action           │ │
│ │ Optional: channel, region                               │ │
│ │ 1,247 fields                                   [Delete] │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ loans                                 [Inactive ○] [Edit]│ │
│ │ Loan origination fields (greyed out styling)            │ │
│ │ Required: loanType, term                                │ │
│ │ 523 fields                                     [Delete] │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Context Card Features:**
- Active/Inactive badge with visual distinction (green vs grey)
- Inactive contexts shown with muted/greyed styling
- Field count displayed (requires count query)
- Edit opens form modal
- Delete opens confirmation dialog

### Delete Confirmation Dialog

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Delete Context                                           │
├─────────────────────────────────────────────────────────────┤
│ Are you sure you want to delete "deposits"?                 │
│                                                             │
│ This will permanently delete:                               │
│   • The context definition                                  │
│   • 1,247 field observations                                │
│                                                             │
│ This action cannot be undone.                               │
│                                                             │
│                              [Cancel]  [Delete Permanently] │
└─────────────────────────────────────────────────────────────┘
```

### Inactive Context Visibility

Inactive contexts are **only visible in the Context Management view**. They do not appear in:
- Search page context dropdown (REQ-2.5)
- Upload page context dropdown (REQ-4.3)

**Backend enforcement:** The API automatically filters out fields from inactive contexts. Search results and autocomplete suggestions will never include data from inactive contexts. The UI does not need to implement any client-side filtering for this - it's handled entirely by the backend.

This prevents users from attempting to search or upload to contexts that are no longer active. To reactivate a context, use the Context Management view.

### String/Regex Toggle (REQ-2.11)

Field path inputs include a toggle between **String** (default) and **Regex** modes:

```
┌─ Field Path ──────────────────────────────────────────────┐
│ [/ceremony/account_______________] [String ▼]             │
│                                    └── or [Regex]         │
└───────────────────────────────────────────────────────────┘
```

**String Mode (default):**
- Input treated as literal text
- Special regex characters (`. * + ? [ ] ( )`) are auto-escaped before sending to API
- Autocomplete enabled when input starts with `/`
- Use for: "Find fields containing `/account/balance`"

**Regex Mode:**
- Input treated as regex pattern
- Special characters have regex meaning
- Autocomplete disabled (patterns can match anything)
- Use for: "Find fields matching `/account/.*/amount`"

**Implementation:**
- `FieldPathInput` is a **shared component** used by both:
  - `QuickSearchForm` - the main input on the home page
  - `AdvancedSearchForm` - the fieldPath filter input
- In string mode, escape input before API call: `input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`
- Toggle state can be encoded in URL as `regex=true` for shareable links
- Context selector and metadata filters do NOT use FieldPathInput (no toggle needed)

---

## Implementation Notes

### Context Update Payloads

When updating a context via `PUT /catalog/contexts/{contextId}`, the **requiredMetadata array must be included** in the payload even though it cannot be changed. The backend validates that requiredMetadata matches the existing values and rejects the request if they differ.

The `ContextForm` component should:
1. Fetch the existing context to get current requiredMetadata
2. Display requiredMetadata as read-only (disabled inputs or plain text)
3. Include the original requiredMetadata values in the PUT payload
4. Allow editing of: displayName, description, optionalMetadata, active

### Shareable URL State

The "shareable searches" feature (Phase 3, step 11) encodes search parameters in the URL query string:

**Parameters encoded in URL:**
- `contextId` - selected context
- `fieldPathContains` - search pattern
- `regex` - true if regex mode enabled (omit for string mode)
- Metadata filter values (e.g., `productCode=dda`)

**Parameters NOT encoded in URL:**
- Client-side filter text (path filter, metadata filter)
- Client-side checkbox states (has null, has empty, etc.)
- Sort column and direction
- Selected row for detail panel

**Important:** The backend's dynamic parameter resolver treats unknown query parameters as metadata filters. The UI must use only the known parameter names (`contextId`, `fieldPathContains`, `page`, `size`) plus valid metadata keys for the selected context to avoid unintended filtering.

---

## Implementation Phases

### Phase 1: Project Foundation
1. Create `ui/` folder with Vite + React + TypeScript
2. Install dependencies (React Query, React Router, Axios, React Hook Form)
3. Configure Tailwind CSS with navy blue theme
4. Install shadcn/ui and add components: button, input, select, table, badge, card, dialog, skeleton
5. Create `.env.local` with `VITE_API_URL=http://localhost:8080`
6. Set up path aliases (`@/` -> `src/`)

### Phase 2: Core Infrastructure
1. Create TypeScript interfaces in `types/index.ts`
2. Create Axios instance in `services/api.ts`
3. Create `services/catalogApi.ts` with all API methods
4. Create `Layout` and `Header` components
5. Set up React Router with pages
6. Configure React Query provider

### Phase 3: Field Search Feature (Two-View Design)

**Quick Search Page (Home):**
1. Build `QuickSearchPage` - simple global search form + results
2. Build `QuickSearchForm` - single input with "Search fields or contexts..." placeholder
3. Integrate with `useFieldSearch` hook using `q=` parameter for OR-based search
4. Link to Advanced Search page

**Advanced Search Page:**
5. Build `AdvancedSearchPage` - filter-based search form + results
6. Build `AdvancedSearchForm` container component
7. Build `ContextSelector` - single-select dropdown with active contexts only (no selection = all active contexts)
8. Build `MetadataFilters` - dynamic inputs based on selected context with autocomplete
9. Build `FieldPathInput` - input with string/regex toggle (see below) and autocomplete in string mode
10. Integrate with `useFieldSearch` hook using AND-based filter parameters

**Results Table:**
11. Build `TruncationWarning` - prominent warning banner when results exceed page size
12. Build `FieldTable` - fixed columns (no metadata), sortable headers
13. Build `FieldRow` - clickable row with highlight state, text highlighting for matches
14. Build `FieldDetailPanel` - slide-out panel showing full field details including all metadata
15. Build `HighlightText` - utility component to highlight search matches in fieldPath
16. Add keyboard navigation (↑/↓ arrows to navigate rows)
17. Add column sorting (click header: asc → desc → original)
18. Add copy fieldPath button (row icon)
19. Add export functionality (CSV/JSON, all/filtered)
20. Wrap results in `FieldResults` with view toggle placeholder (Table active, Tree disabled)

**Faceted Filtering (Left Sidebar) + Column Header Filters:**
21. Build `useFacets` hook - compute facet index from results (metadata keys only), manage filter state, disjunctive counting
22. Build `FacetSidebar` - collapsible container for metadata facets ONLY, header with count tooltip, scrollable, "Search facets..." if > 10 keys
23. Build `MetadataFacet` - single facet row showing key name and value count, active facets pinned to top
24. Build `FacetPopover` - popover with "Include any"/"Require one" mode toggle, value search input, alphabetical values, [Clear] button
25. Build `PathColumnFilter` - text input filter for Field Path column header
26. Build `ContextColumnFilter` - dropdown filter for Context column header (distinct values from results)
27. Build `ColumnFilter` - dropdown filter component for Null?/Empty? column headers (All/Yes/No)
28. Wire all filter state to filter displayed results (client-side, instant)
29. Implement mode-switching warning dialog for "Include any" → "Require one" with multiple values

### Phase 4: Context Management
1. Build `useContextMutations` hook (create/update/delete)
2. Update `useContexts` hook to support `includeCounts` option
3. Build context components:
   - `ContextList` - displays all contexts
   - `ContextCard` - single context with active/inactive badge, field count, actions
   - `ContextForm` - create/edit form with metadata array inputs, active toggle
   - `ContextDeleteDialog` - confirmation showing field count to be deleted
4. Add toast notifications for success/error
5. Style inactive contexts with muted/greyed appearance

### Phase 5: XML Upload Feature
1. Create `xmlParser.ts` service:
   - Recursive XML tree traversal using DOMParser
   - Strip namespaces (use localName only)
   - Extract field paths: `/Root/Parent/Child` and `/Root/@attr`
   - Track statistics:
     - `count`: number of occurrences
     - `hasNull`: true if element has `xsi:nil="true"` attribute (fix SDK bug)
     - `hasEmpty`: true if element content is whitespace-only or empty
   - Only count leaf elements (elements without children)
   - Return array of `CatalogObservation` objects
   - **Note:** Existing SDKs don't implement xsi:nil detection - this is correct behavior
2. Build `useXmlUpload` hook (parse files, batch submit to API)
3. Build upload components:
   - `FileDropZone` - drag-and-drop with multi-file support
   - `MetadataForm` - context selector (active contexts only) + dynamic metadata fields with autocomplete
   - `UploadProgress` - progress bar per file
   - `UploadResults` - summary (X observations from Y files)
4. Create `UploadPage` assembling all components
5. Write tests for `xmlParser.ts`:
   - Test xsi:nil="true" detection sets hasNull=true
   - Test empty elements set hasEmpty=true
   - Test namespace stripping
   - Use `jsdom` environment in Vitest config for DOMParser support

### Phase 6: Integrate Autocomplete
The `/catalog/suggest` endpoint is already implemented in the backend. This phase integrates it:
1. Wire `useSuggest` hook to the `/catalog/suggest` endpoint
2. Test autocomplete with various scoping combinations (cross-context, context-scoped, metadata-scoped)
3. Integrate autocomplete into Search and Upload pages

### Phase 7: Polish & Testing
1. Add ErrorBoundary component
2. Add empty state displays
3. Write tests for `useFieldSearch` hook
4. Write tests for `catalogApi` service
5. Responsive design tweaks
6. Create README.md with setup instructions

---

## Backend Support (Implemented)

The following backend features are already implemented and ready for UI integration:

### CORS Configuration ✅
CORS is configured in `WebConfig.java` to allow requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (alternative React port)

Configurable via `catalog.cors.allowed-origins` property.

### Autocomplete Suggest Endpoint ✅
**Endpoint:** `GET /catalog/suggest`

Supports all autocomplete use cases:
- Cross-context fieldPath: `?field=fieldPath&prefix=/Cere&limit=15`
- Scoped fieldPath: `?field=fieldPath&prefix=/Cere&contextId=deposits&metadata.productCode=DDA`
- Metadata values: `?field=metadata.productCode&prefix=DD&contextId=deposits`

### Context Field Counts ✅
**Endpoint:** `GET /catalog/contexts?includeCounts=true`

Returns contexts with optional `fieldCount` property for displaying field counts in context cards.

### Plain Text Search ✅
The `fieldPathContains` parameter now accepts both:
- Full XPath patterns starting with `/` (e.g., `/Ceremony/Account`)
- Plain text for contains searches (e.g., `Amount`, `FeeCode`)

### Global Search (`q=`) ✅
**Endpoint:** `GET /catalog/fields?q=searchTerm`

Supports Quick Search with OR-based logic:
- Searches `fieldPath`, `contextId`, AND `metadata values` using OR logic
- String mode (default): case-insensitive contains match on all three
- Regex mode: regex pattern match on all three (when `useRegex=true`)
- When `q` is provided, other filter parameters are ignored
- Example: `?q=Amount` finds fields where fieldPath OR contextId OR any metadata value contains "Amount"
- Example: `?q=^/Ceremony/.*Amount&useRegex=true` uses regex pattern matching

See `docs/api/API_SPECIFICATION.md` for full API documentation.

---

## Key Files Reference

| Purpose | File |
|---------|------|
| Requirements (traceability source) | `docs/ui/REQUIREMENTS.md` |
| API contract | `docs/api/API_SPECIFICATION.md` |
| Context domain | `src/main/java/com/ceremony/catalog/domain/Context.java` |
| CatalogEntry domain | `src/main/java/com/ceremony/catalog/domain/CatalogEntry.java` |
| CORS config | `src/main/java/com/ceremony/catalog/config/WebConfig.java` |
| Suggest endpoint | `src/main/java/com/ceremony/catalog/api/CatalogController.java` |
| C# SDK XML parser (primary reference) | `sdks/dotnet/net48/CeremonyFieldCatalogSdk.cs` |
| Python XML parser (reference) | `sdks/python/ceremony_catalog_sdk.py` |
| Python parser tests (reference) | `sdks/python/test_ceremony_catalog_sdk.py` |

---

## UI Configuration (`config.ts`)

Centralized configuration values. See REQUIREMENTS.md "UI Configuration" section for full documentation.

```typescript
// config.ts
export const config = {
  /** Maximum results per search. Must align with backend max-page-size. */
  MAX_RESULTS_PER_PAGE: 250,

  /** Debounce delay for autocomplete API requests (ms). */
  AUTOCOMPLETE_DEBOUNCE_MS: 300,

  /** Detail panel slide animation duration (ms). Keep fast. */
  DETAIL_PANEL_ANIMATION_MS: 100,

  /** API base URL from environment. */
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
} as const;
```

---

## Core TypeScript Interfaces

```typescript
interface Context {
  contextId: string;
  displayName: string;
  description: string | null;  // API returns null when not set
  requiredMetadata: string[];
  optionalMetadata: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string | null;    // API returns null when not updated
}

// Extended context with field count (from GET /contexts?includeCounts=true)
interface ContextWithCount extends Context {
  fieldCount: number;
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
}

// Output from XML parser, input to observations API
interface CatalogObservation {
  metadata: Record<string, string>;
  fieldPath: string;
  count: number;
  hasNull: boolean;
  hasEmpty: boolean;
}

interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// For XML upload progress tracking
interface UploadStatus {
  fileName: string;
  status: 'pending' | 'parsing' | 'submitting' | 'complete' | 'error';
  observationCount?: number;
  error?: string;
}

// API error response (matches GlobalExceptionHandler output)
interface ErrorResponse {
  message: string;           // Human-readable error message
  status: number;            // HTTP status code
  timestamp: string;         // ISO 8601 timestamp
  error: string;             // Error type (e.g., "Bad Request", "Validation Error")
  errors?: string[];         // Optional array of validation error messages
}

// Faceted filtering types (useFacets hook)
interface FacetValue {
  value: string;
  count: number;
}

interface FacetState {
  values: FacetValue[];        // Sorted alphabetically (A-Z)
  mode: 'any' | 'one';         // "Include any" (OR) vs "Require one" (AND)
  selected: Set<string>;       // Currently selected values
}

interface FacetIndex {
  [key: string]: FacetState;   // key = metadata key name (NOT contextId - that's a column filter)
}

// Note: Backend uses Map<String, String> for metadata, so each entry has exactly
// ONE value per key. "Require one" = entry's value equals selected; "Include any"
// = entry's value is in selected set.

interface useFacetsReturn {
  // State
  facets: FacetIndex;                                       // Current facet state
  filteredResults: CatalogEntry[];                          // Results after applying facet filters

  // Accessors
  getFacetByKey: (key: string) => FacetState | undefined;   // Get single facet for popover display
  getActiveFacets: () => Array<{key: string; values: string[]}>; // Get active facets for pinning/UI
  hasActiveFacets: () => boolean;                           // True if any facet has selections

  // Mutations
  setFacetMode: (key: string, mode: 'any' | 'one') => void; // Switch mode (shows warning if multiple selected)
  toggleFacetValue: (key: string, value: string) => void;   // Toggle a value selection
  clearFacet: (key: string) => void;                        // Clear one facet's selections
  clearAllFacets: () => void;                               // Clear all facet filters

  // Recompute (call when column-filtered results change)
  recomputeIndex: (newResults: CatalogEntry[]) => void;     // Rebuild facet index from new result set
}
```

---

## Dependencies

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.x",
    "axios": "^1.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-hook-form": "^7.x",
    "react-router-dom": "^6.x",
    "lucide-react": "^0.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.x",
    "tailwindcss": "^3.x",
    "typescript": "^5.x",
    "vite": "^5.x",
    "vitest": "^1.x",
    "@testing-library/react": "^14.x"
  }
}
```

---

## Requirements Traceability

This section maps implementation components to requirements defined in `REQUIREMENTS.md`.

### Component to Requirements Matrix

| Component | Implements Requirements |
|-----------|------------------------|
| **Context Components** | |
| `ContextList.tsx` | REQ-1.1 (view contexts) |
| `ContextCard.tsx` | REQ-1.1 (display info), REQ-1.5 (inactive styling) |
| `ContextForm.tsx` | REQ-1.2 (create), REQ-1.3 (edit) |
| `ContextDeleteDialog.tsx` | REQ-1.4 (delete confirmation) |
| **Search Components** | |
| `QuickSearchForm.tsx` | REQ-2.1 (global search with `/` fieldPath mode), REQ-2.4 (link to Advanced) |
| `AdvancedSearchForm.tsx` | REQ-2.5 (context selector), REQ-2.6 (metadata filters), REQ-2.10 (AND logic) |
| `ContextSelector.tsx` | REQ-2.5 (context dropdown, active only) |
| `MetadataFilters.tsx` | REQ-2.6 (dynamic metadata), REQ-2.9 (autocomplete) |
| `FieldPathInput.tsx` | REQ-2.7 (field path filter), REQ-2.8 (autocomplete), REQ-2.11 (string/regex toggle) |
| **Results Components** | |
| `TruncationWarning.tsx` | REQ-3.2 (truncation warning banner) |
| `FieldTable.tsx` | REQ-3.1 (sortable table, column filters), REQ-3.5 (keyboard nav) |
| `FieldRow.tsx` | REQ-3.1 (display), REQ-3.7 (highlight matches) |
| `FieldDetailPanel.tsx` | REQ-3.4 (detail panel showing context, all metadata, statistics) |
| `HighlightText.tsx` | REQ-3.7 (highlight matching text) |
| `ExportButton.tsx` | REQ-3.6 (CSV/JSON export with column order) |
| `ColumnFilter.tsx` | REQ-3.1 (Null?/Empty? header filter dropdowns) |
| **Faceted Filtering Components** | |
| `FacetSidebar.tsx` | REQ-3.3 (client-side filtering container), REQ-3.8 (collapsible, scrollable, metadata only) |
| `MetadataFacet.tsx` | REQ-3.8 (faceted metadata filtering) |
| `FacetPopover.tsx` | REQ-3.8 ("Include any"/"Require one" mode, value selection, search) |
| `PathColumnFilter.tsx` | REQ-3.1 (Field Path column header text filter) |
| `ContextColumnFilter.tsx` | REQ-3.1 (Context column header dropdown filter) |
| `useFacets.ts` | REQ-3.8 (facet index computation, disjunctive counting) |
| **Upload Components** | |
| `FileDropZone.tsx` | REQ-4.1 (drag-drop upload) |
| `MetadataForm.tsx` | REQ-4.3 (metadata input with autocomplete) |
| `UploadProgress.tsx` | REQ-4.4 (progress indication) |
| `UploadResults.tsx` | REQ-4.4 (results summary) |
| **Services** | |
| `xmlParser.ts` | REQ-4.2 (XML parsing logic) |
| `catalogApi.ts` | REQ-5.1 (API integration) |
| **Infrastructure** | |
| `ErrorBoundary.tsx` | REQ-5.3 (error handling) |
| `Layout.tsx` | REQ-5.2 (responsive design) |

### Phase to Requirements Matrix

| Phase | Requirements Addressed |
|-------|----------------------|
| Phase 1: Project Foundation | REQ-5.5 (bundle size), Design Specs |
| Phase 2: Core Infrastructure | REQ-5.1 (API), REQ-5.3 (error handling) |
| Phase 3: Field Search | REQ-2.1 through REQ-2.11, REQ-3.1 through REQ-3.8 |
| Phase 4: Context Management | REQ-1.1 through REQ-1.5 |
| Phase 5: XML Upload | REQ-4.1 through REQ-4.4 |
| Phase 6: Autocomplete Backend | REQ-2.5, REQ-2.6 (backend support) |
| Phase 7: Polish & Testing | REQ-5.2 (responsive), REQ-5.3 (error states) |

### Design Specifications

Colors, typography, and layout principles are defined in `REQUIREMENTS.md` under "Design Specifications". This plan implements those specifications using:

- **Tailwind CSS** with custom theme configuration matching the color scheme
- **Inter font** via Google Fonts or local installation
- **Monaco/Consolas** for monospace code display
- **shadcn/ui** components styled to match the design system
