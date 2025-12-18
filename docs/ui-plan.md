# UI First Release Implementation Plan

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
│   │   │   ├── FieldTable.tsx       # Virtual scrolling, dynamic columns, sortable
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
│   │   ├── useFieldSearch.ts      # Search (loads all results)
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

**No server-side pagination** - Load all results at once, handle filtering client-side.

**Virtual Scrolling** - Use `@tanstack/react-virtual` for efficient rendering of large result sets. Since we load all results without pagination, virtual scrolling is critical to prevent browser freezes when displaying 1000+ rows. Only renders visible rows plus a small buffer.

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
2. Build `useFieldSearch` hook with debounce (no pagination - load all results)
3. Build `useSuggest` hook for autocomplete (handles both cross-context and scoped)
4. Build search components:
   - `QuickFindInput` - smart input that shows suggestions only when starts with `/`
   - `ContextSelector` - dropdown of contexts (selecting triggers Mode B)
   - `MetadataFilters` - dynamic inputs based on selected context with autocomplete
   - `SearchForm` - container managing Mode A vs Mode B state
   - `ResultsFilter` - client-side filter inputs (path filter + metadata filter)
   - `FieldTable` with virtual scrolling (@tanstack/react-virtual), dynamic columns
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
1. Create `xmlParser.ts` service (port from Python SDK):
   - Recursive XML tree traversal using DOMParser
   - Extract field paths: `/Root/Parent/Child` and `/Root/@attr`
   - Track statistics: count, hasNull, hasEmpty
   - Return array of `CatalogObservation` objects
2. Build `useXmlUpload` hook (parse files, batch submit to API)
3. Build upload components:
   - `FileDropZone` - drag-and-drop with multi-file support
   - `MetadataForm` - dynamic fields based on context with autocomplete
   - `UploadProgress` - progress bar per file
   - `UploadResults` - summary (X observations from Y files)
4. Create `UploadPage` assembling all components
5. Write tests for `xmlParser.ts` (critical - must match Python behavior)

### Phase 6: Autocomplete Backend Endpoint
1. Add `GET /catalog/suggest` endpoint to Spring Boot
   - Supports: `field`, `prefix`, `contextId` (optional), `metadata.*` (optional), `limit`
   - Uses MongoDB `distinct()` with regex prefix matching
   - Add index on `fieldPath` for performance
2. Test endpoint with various scoping combinations
3. Wire `useSuggest` hook to the new endpoint (used by both Search and Upload pages)

### Phase 7: Polish & Testing
1. Add ErrorBoundary component
2. Add empty state displays
3. Write tests for `useFieldSearch` hook
4. Write tests for `catalogApi` service
5. Responsive design tweaks
6. Create README.md with setup instructions

---

## Backend Changes Required

### 1. CORS Configuration
Add to `WebConfig.java`:

```java
@Override
public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/catalog/**")
        .allowedOrigins("http://localhost:3000")
        .allowedMethods("GET", "POST", "PUT", "DELETE")
        .allowedHeaders("*");
}
```

**File**: `src/main/java/com/ceremony/catalog/config/WebConfig.java`

### 2. Autocomplete Suggest Endpoint
Add generic endpoint for all autocomplete needs:

```java
// GET /catalog/suggest?field=fieldPath&prefix=/Cere&contextId=deposits&limit=10
// GET /catalog/suggest?field=metadata.productCode&prefix=DD&contextId=deposits&limit=10
@GetMapping("/suggest")
public List<String> suggest(
    @RequestParam String field,           // "fieldPath" or "metadata.{name}"
    @RequestParam String prefix,          // What user has typed
    @RequestParam(required = false) String contextId,  // Optional scope
    @RequestParam(required = false) Map<String, String> metadata,  // Additional scope
    @RequestParam(defaultValue = "10") int limit) {
    return catalogService.suggestValues(field, prefix, contextId, metadata, limit);
}
```

**Use cases:**
- Cross-context fieldPath: `?field=fieldPath&prefix=/Cere&limit=15`
- Scoped fieldPath: `?field=fieldPath&prefix=/Cere&contextId=deposits&metadata.productCode=DDA`
- Metadata values: `?field=metadata.productCode&prefix=DD&contextId=deposits`

**Files to modify**:
- `src/main/java/com/ceremony/catalog/api/CatalogController.java`
- `src/main/java/com/ceremony/catalog/service/CatalogService.java`
- `src/main/java/com/ceremony/catalog/persistence/CatalogCustomRepository.java`
- `src/main/java/com/ceremony/catalog/persistence/CatalogCustomRepositoryImpl.java`

**MongoDB query pattern:**
```javascript
db.catalog_fields.distinct("fieldPath", {
  fieldPath: { $regex: "^/Cere", $options: "i" },
  contextId: "deposits",  // if provided
  "metadata.productCode": "DDA"  // if provided
}).slice(0, limit)
```

### 3. Include Field Counts in Contexts Endpoint
Modify existing GET /contexts to optionally include field counts:

```java
// GET /catalog/contexts?includeCounts=true
@GetMapping
public List<ContextWithCount> getAllContexts(
    @RequestParam(defaultValue = "false") boolean includeCounts) {
    if (includeCounts) {
        return contextService.getAllContextsWithCounts();
    }
    return contextService.getAllContexts();
}
```

Returns each context with optional `fieldCount` property when `includeCounts=true`.

**Files to modify**:
- `src/main/java/com/ceremony/catalog/api/ContextController.java`
- `src/main/java/com/ceremony/catalog/service/ContextService.java`

---

## Key Files Reference

| Purpose | File |
|---------|------|
| API contract | `docs/ui-docs/API_SPECIFICATION.md` |
| Sample components | `docs/ui-docs/SAMPLE_COMPONENTS.md` |
| Context domain | `src/main/java/com/ceremony/catalog/domain/Context.java` |
| CatalogEntry domain | `src/main/java/com/ceremony/catalog/domain/CatalogEntry.java` |
| CORS config (to modify) | `src/main/java/com/ceremony/catalog/config/WebConfig.java` |
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
    "@tanstack/react-virtual": "^3.x",
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
