# UI First Release Implementation Plan

## Document Purpose

This document provides the technical implementation plan for the Ceremony Field Catalog UI. It implements the requirements defined in `REQUIREMENTS.md`. See the "Requirements Traceability" section at the end for mapping between components and requirements.

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
│   │   ├── fields/                # Field search components
│   │   │   ├── SearchForm.tsx       # Container managing Mode A/B state
│   │   │   ├── QuickFindInput.tsx   # Smart input (suggests when starts with /)
│   │   │   ├── ContextSelector.tsx
│   │   │   ├── MetadataFilters.tsx  # Dynamic filters with autocomplete
│   │   │   ├── ResultsFilter.tsx    # Client-side filter (path + metadata)
│   │   │   ├── FieldResults.tsx     # Wrapper with view toggle (Table/Tree)
│   │   │   ├── FieldTable.tsx       # Dynamic columns, sortable, keyboard nav
│   │   │   ├── FieldRow.tsx         # Clickable with highlight state + copy btn
│   │   │   ├── FieldDetailPanel.tsx # Slide-out detail panel
│   │   │   ├── HighlightText.tsx    # Highlights search matches in text
│   │   │   └── ExportButton.tsx     # CSV/JSON export (all or filtered)
│   │   └── upload/                # XML upload components
│   │       ├── FileDropZone.tsx   # Drag-and-drop multi-file zone
│   │       ├── MetadataForm.tsx   # Dynamic metadata inputs with autocomplete
│   │       ├── UploadProgress.tsx # Progress bar and file status
│   │       └── UploadResults.tsx  # Summary of observations submitted
│   ├── hooks/
│   │   ├── useContexts.ts         # Fetch contexts (with optional includeCounts)
│   │   ├── useContextMutations.ts # Create/update/delete
│   │   ├── useFieldSearch.ts      # Search (single page, max 250 results)
│   │   ├── useSuggest.ts          # Autocomplete for fieldPath and metadata
│   │   ├── useXmlUpload.ts        # Handle file parsing and submission
│   │   └── useDebounce.ts
│   ├── services/
│   │   ├── api.ts                 # Axios instance
│   │   ├── catalogApi.ts          # API methods
│   │   └── xmlParser.ts           # XML to observations (ported from Python)
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   ├── pages/
│   │   ├── FieldSearchPage.tsx    # Home page
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
| `/` | FieldSearchPage | Search form + results table (home) |
| `/contexts` | ContextsPage | Context list with CRUD |
| `/upload` | UploadPage | XML file upload with parsing |

---

## Search Page Design (Two Modes)

The search page has two distinct modes based on whether a context is selected:

### Mode A: Quick Find (No Context Selected)

```
┌─────────────────────────────────────────────────────────────┐
│  Quick Find: [/Ceremony/Acc_____] [🔍]                      │
│              ┌─────────────────────────┐                    │
│              │ /Ceremony/Account       │  ← suggestions     │
│              │ /Ceremony/Account/Fee   │    (only when      │
│              │ /Ceremony/AcctNumber    │    starts with /)  │
│              └─────────────────────────┘                    │
│                                                             │
│  Select a context for metadata filtering:                   │
│  Context: [Select...▼]                                      │
└─────────────────────────────────────────────────────────────┘

Results (23 matches across 5 contexts):
┌────────────────────────────────┬───────────┬─────┬─────┬───────┐
│ Field Path                     │ Context   │ Min │ Max │ Null? │
└────────────────────────────────┴───────────┴─────┴─────┴───────┘
```

**Behavior:**
- Input starts with `/` → Show autocomplete suggestions (cross-context)
- Input is plain text (e.g., "LoanAmount") → Contains search, no suggestions
- Results table shows minimal columns (no metadata - it varies by context)
- Click row → Side panel shows full details including metadata

### Mode B: Context Search (Context Selected)

```
┌─────────────────────────────────────────────────────────────┐
│  Quick Find: [____________]                                 │
│                                                             │
│  Context: [deposits ▼]                                      │
│                                                             │
│  ┌─ Metadata Filters ────────────────────────────────────┐  │
│  │ productCode: [DDA____▼]  productSubCode: [____]       │  │
│  │ action: [Fulfillment▼]                                │  │
│  │              ↑ autocomplete (scoped to context)       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Field Path: [/Ceremony/Acc____] [🔍]                       │
│                    ↑ autocomplete (scoped to context +      │
│                      selected metadata filters)             │
└─────────────────────────────────────────────────────────────┘

Results (156 matches in deposits):
┌─────────────────────────────┬─────────────┬────────────┬─────┬─────┬───────┬───────┐
│ Field Path ↕                │ productCode↕│ action   ↕ │ Min↕│ Max↕│ Null?↕│Empty?↕│
└─────────────────────────────┴─────────────┴────────────┴─────┴─────┴───────┴───────┘
```

**Behavior:**
- Selecting context reveals metadata filter fields (required + optional for that context)
- All filters have autocomplete (scoped to context + other selected filters)
- Results table shows: metadata columns + all 4 tracked properties
- All columns sortable (click header)
- Click row → Side panel shows full details

### Results Interaction Features

**Single Page Results (POC Simplification)** - API returns max 250 results per request. If more results exist, UI displays "Showing 250 of X results - refine your search for more specific results." No pagination controls or fetching additional pages. This keeps the POC simple while still being useful.

**Keyboard Navigation:**
- Click row → highlight it, show detail panel on right
- Arrow keys (↑/↓) navigate between rows instantly
- Selected row stays highlighted, detail panel updates

**Client-Side Filtering (instant, no API calls):**
```
┌─ Refine Results ────────────────────────────────────────────┐
│ Filter by path: [Te________]  Filter by metadata: [C7B____] │
│                                                             │
│ ☐ Has null values    ☐ Has empty values                    │
│ ☐ Optional (min=0)   ☐ Repeating (max>1)   [Clear Filters] │
└─────────────────────────────────────────────────────────────┘

Results (showing 1 of 40):                        ↓ click header to sort
┌────────────────────────────────┬───────────┬─────┬─────┬───────┬───────┐
│ Field Path ↕                   │ Context ↕ │ Min↕│ Max↕│ Null?↕│Empty?↕│
├────────────────────────────────┼───────────┼─────┼─────┼───────┼───────┤
│ ▶ /Ceremony/Account/Details   │ contextB  │ 1   │ 1   │ No    │ No    │  ← selected
└────────────────────────────────┴───────────┴─────┴─────┴───────┴───────┘
```

**All tracked properties shown:**
- `minOccurs` - minimum occurrences per document
- `maxOccurs` - maximum occurrences per document
- `allowsNull` - whether null values observed
- `allowsEmpty` - whether empty values observed

**Sortable columns:**
- Click column header → sort ascending
- Click again → sort descending
- Click again → return to original order
- Works on all columns (string, number, boolean)

**Highlight Matching Text:**
- When searching by fieldPath pattern, highlight the matched portion in results
- Example: search "Amount" → displays "/Ceremony/Account/Fee/**Amount**" with "Amount" highlighted
- Uses `<mark>` tag or styled `<span>` for highlight
- Works with both Quick Find and Field Path filter

**Filter logic (all client-side, instant):**
- Path filter: `fieldPath.includes(filterText)` (case-insensitive)
- Metadata filter: matches if ANY metadata value contains the text
- Statistics checkboxes:
  - Has null: `allowsNull === true`
  - Has empty: `allowsEmpty === true`
  - Optional: `minOccurs === 0`
  - Repeating: `maxOccurs > 1`
- All filters AND together
- Clear Filters button resets all to default

### Field Detail Panel (Slide-out)

```
┌─ Field Details ─────────────────────────────────────────────┐
│ Path: /Ceremony/Account/FeeCode/Amount          [📋 Copy]   │
│ Context: deposits                                           │
│                                                             │
│ Metadata:                                                   │
│   productCode: DDA                                          │
│   productSubCode: 4S                                        │
│   action: Fulfillment                                       │
│                                                             │
│ Statistics:                                                 │
│   Occurrences: 0-5 per document                             │
│   Allows null: Yes                                          │
│   Allows empty: No                                          │
└─────────────────────────────────────────────────────────────┘
```

### Additional Search Page Features

**Copy Field Path:**
- Copy button on each row (icon) + in detail panel
- Copies full fieldPath to clipboard
- Toast notification: "Copied to clipboard"

**Export Results:**
```
┌─ Export ─────────────────────────────────────────┐
│ Format: [CSV ▼] [JSON]                           │
│ Scope:  [All results (247)] [Filtered only (12)] │
│                              [⬇ Download]        │
└──────────────────────────────────────────────────┘
```
- CSV or JSON format
- All results OR just currently filtered results
- Download triggers browser file save

**View Mode (Future-Ready):**
- Results wrapped in `FieldResults` component
- Contains view toggle: `[Table] [Tree]` (Tree disabled for v1)
- Architecture allows swapping between `FieldTable` and `FieldTree` renderers
- Tree view would show hierarchical path structure (future enhancement)

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

### Upload Page - Inactive Context Warning

On Upload page, if user selects an inactive context:
- Show warning banner: "This context is inactive and may not accept observations"
- Still allow upload attempt (backend will reject if truly inactive)

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

### Phase 3: Field Search Feature (Two-Mode Design)
1. Build `useContexts` hook (fetch contexts for dropdown)
2. Build `useFieldSearch` hook with debounce (single page, max 250 results)
3. Build `useSuggest` hook for autocomplete (handles both cross-context and scoped)
4. Build search components:
   - `QuickFindInput` - smart input that shows suggestions only when starts with `/`
   - `ContextSelector` - dropdown of contexts (selecting triggers Mode B)
   - `MetadataFilters` - dynamic inputs based on selected context with autocomplete
   - `SearchForm` - container managing Mode A vs Mode B state
   - `ResultsFilter` - client-side filter inputs (path filter + metadata filter)
   - `FieldTable` with dynamic columns, sortable headers
   - `FieldRow` - clickable row with highlight state, text highlighting for matches
   - `FieldDetailPanel` - slide-out panel showing full field details
   - `HighlightText` - utility component to highlight search matches in fieldPath
5. Add keyboard navigation (↑/↓ arrows to navigate rows)
6. Add client-side filtering:
   - Text filters (path, metadata)
   - Statistics checkboxes (has null, has empty, optional, repeating)
   - Clear Filters button
7. Add column sorting (click header: asc → desc → original)
8. Add copy fieldPath button (row icon + detail panel)
9. Add export functionality (CSV/JSON, all/filtered)
10. Wrap results in `FieldResults` with view toggle placeholder (Table active, Tree disabled)
11. Wire up URL state for shareable searches

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
1. Create `xmlParser.ts` service (match C# SDK logic in `CeremonyFieldCatalogSdk.cs`):
   - Recursive XML tree traversal using DOMParser
   - Strip namespaces (use localName only)
   - Extract field paths: `/Root/Parent/Child` and `/Root/@attr`
   - Track statistics: count, hasNull (`value === null`), hasEmpty (`value is whitespace-only or empty`)
   - Only count leaf elements (elements without children)
   - Return array of `CatalogObservation` objects
2. Build `useXmlUpload` hook (parse files, batch submit to API)
3. Build upload components:
   - `FileDropZone` - drag-and-drop with multi-file support
   - `MetadataForm` - dynamic fields based on context with autocomplete
   - `UploadProgress` - progress bar per file
   - `UploadResults` - summary (X observations from Y files)
4. Create `UploadPage` assembling all components
5. Write tests for `xmlParser.ts` (critical - must match Python behavior)

### Phase 6: Wire Autocomplete Hook
1. Wire `useSuggest` hook to the existing `/catalog/suggest` endpoint
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

## Core TypeScript Interfaces

```typescript
interface Context {
  contextId: string;
  displayName: string;
  description?: string;
  requiredMetadata: string[];
  optionalMetadata: string[];
  active: boolean;
  createdAt: string;
  updatedAt?: string;
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
| `SearchForm.tsx` | REQ-2.1 (context search), REQ-2.4 (cross-context) |
| `ContextSelector.tsx` | REQ-2.1 (context dropdown) |
| `MetadataFilters.tsx` | REQ-2.2 (dynamic metadata), REQ-2.6 (autocomplete) |
| `QuickFindInput.tsx` | REQ-2.3 (path search), REQ-2.5 (autocomplete) |
| **Results Components** | |
| `FieldTable.tsx` | REQ-3.1 (sortable table), REQ-3.5 (keyboard nav) |
| `FieldRow.tsx` | REQ-3.1 (display), REQ-3.7 (highlight matches) |
| `FieldDetailPanel.tsx` | REQ-3.4 (detail panel with copy) |
| `ResultsFilter.tsx` | REQ-3.3 (client-side filtering) |
| `HighlightText.tsx` | REQ-3.7 (highlight matching text) |
| `ExportButton.tsx` | REQ-3.6 (CSV/JSON export) |
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
| Phase 3: Field Search | REQ-2.1 through REQ-2.6, REQ-3.1 through REQ-3.7 |
| Phase 4: Context Management | REQ-1.1 through REQ-1.5 |
| Phase 5: XML Upload | REQ-4.1 through REQ-4.4 |
| Phase 6: Autocomplete Backend | REQ-2.5, REQ-2.6 (backend support) |
| Phase 7: Polish & Testing | REQ-5.2 (responsive), REQ-5.3 (error states), REQ-5.4 (accessibility) |

### Design Specifications

Colors, typography, and layout principles are defined in `REQUIREMENTS.md` under "Design Specifications". This plan implements those specifications using:

- **Tailwind CSS** with custom theme configuration matching the color scheme
- **Inter font** via Google Fonts or local installation
- **Monaco/Consolas** for monospace code display
- **shadcn/ui** components styled to match the design system
