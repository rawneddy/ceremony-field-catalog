# Ceremony Field Catalog UI - Requirements

## Document Purpose

This document defines the functional and non-functional requirements for the Ceremony Field Catalog UI. It serves as the source of truth for requirements traceability. Implementation details are in `IMPLEMENTATION.md`.

---

## Project Overview

Build a web-based user interface for browsing, searching, and managing the Ceremony Field Catalog. The UI enables developers and analysts to explore XML field usage patterns across different business contexts, manage context definitions, and upload XML files for field observation.

---

## Core Concepts

The UI supports the **dynamic Context system**:

- **Contexts** are observation points created via API (not hardcoded)
- Each Context has its own **required** and **optional** metadata fields
- Contexts define **metadata extraction rules** for smart upload workflows
- **CatalogEntries** are fields observed within a context
- Field identity is determined by: `contextId + requiredMetadata + fieldPath`
- Searches can filter by context, metadata fields, or field path patterns

### Data Normalization

The backend normalizes data to **lowercase** for case-insensitive matching:

**Metadata normalization:**
- All metadata keys and values are stored as lowercase
- UI displays metadata values as stored (lowercase)
- UI can accept any case in filter inputs (normalized by API)
- Autocomplete suggestions appear in lowercase (as stored)

**Field path normalization:**
- All `fieldPath` values are stored as lowercase (e.g., `/ceremony/account/amount`)
- UI displays field paths as stored (lowercase)
- Field path search inputs are normalized by API before matching

---

## User Personas

### Software Developers
- Need to understand XML field usage in different contexts
- Want to find specific fields by XPath patterns
- Need to see field occurrence statistics for data validation
- Require efficient search and filtering capabilities

### Business Analysts
- Need to understand field usage across business processes
- Want to compare field patterns between different products/documents
- Need to generate reports on field coverage and usage
- Require high-level overview and drill-down capabilities

### QA Engineers
- Need to verify field implementations across environments
- Want to validate data quality attributes (null/empty allowances)
- Need to compare expected vs. actual field occurrences
- Require detailed field metadata for testing scenarios

---

## Requirements

### REQ-1: Context Management

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-1.1 | View all contexts | Display card grid of all contexts showing: displayName, description, required/optional metadata fields, active/inactive status, field count. Includes filter/search input. |
| REQ-1.2 | Create new context | Modal form to create context with: contextId, displayName, description, required metadata array, optional metadata array, metadata extraction rules with validation regex, active flag. |
| REQ-1.3 | Edit existing context | Edit modal allowing changes to: displayName, description, optional metadata, metadata extraction rules, active flag. Required metadata is read-only after creation. |
| REQ-1.4 | Delete context | Browser confirmation dialog showing context name and field count that will be deleted. Requires explicit confirmation. |
| REQ-1.5 | Visual distinction for inactive contexts | Inactive contexts displayed with muted/greyed styling to indicate they are not accepting observations |
| REQ-1.6 | Metadata extraction rules | Each metadata field can have extraction rules defining XPath patterns and optional validation regex for smart upload auto-extraction |

**Note on inactive contexts:** The backend API automatically filters out fields from inactive contexts in all search and autocomplete responses. The UI hides inactive contexts from dropdowns (REQ-2.3, REQ-4.2) - no client-side result filtering is required.

### REQ-2: Field Search (Two-View Model)

The UI provides two distinct search views optimized for different use cases:

#### Discovery View (Home Page)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-2.1 | Reactive global search | Single search input with debounced reactive search. Results update automatically as user types. Uses `?q=` parameter for global search across fieldPath, contextId, and metadata values using OR logic. |
| REQ-2.2 | Context-scoped filtering | Context selector dropdown to narrow results to specific context. When selected, displays tag-based metadata filters for that context's required and optional fields. |
| REQ-2.3 | Multi-value metadata filters | Tag/chip-based metadata filter inputs supporting multiple values per field with OR logic within field, AND logic between fields. Results only refresh when a tag is added/removed (not while typing). |
| REQ-2.4 | String/Regex toggle | Field path input includes toggle between String (default) and Regex modes. In String mode: input treated as literal text. In Regex mode: input treated as regex pattern. |

#### Field Search View

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-2.5 | Submit-based search | Search input requiring explicit Search button click to execute. Shows empty state with guidance before first search. |
| REQ-2.6 | Field path autocomplete | In string mode, shows autocomplete suggestions for field paths. Arrow keys navigate suggestions, Enter selects, Tab partial-completes. |
| REQ-2.7 | Cross-context results | Results always show context column (contextId). No metadata columns since they vary by context. |
| REQ-2.8 | String/Regex toggle | Same as REQ-2.4. Toggle between literal text and regex pattern matching. |

### REQ-3: Results Display

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-3.1 | Results table | Display results in table with fixed columns: fieldPath, context, minOccurs, maxOccurs, allowsNull, allowsEmpty. All columns sortable with three-state toggle (ascending -> descending -> original order). |
| REQ-3.2 | Single-page results | Display up to `MAX_RESULTS_PER_PAGE` results per search (see UI Configuration). If more exist, show a prominent warning banner indicating results are truncated and the user should refine their search. |
| REQ-3.3 | Faceted metadata filtering | Left sidebar provides instant client-side faceted metadata filtering (REQ-3.8). Filters apply instantly without API calls. |
| REQ-3.4 | Field detail panel | Clicking a row opens slide-out panel showing: context, **all metadata key-value pairs**, occurrence range, null/empty flags, observation timestamps. Panel slides from right with `DETAIL_PANEL_ANIMATION_MS` timing. |
| REQ-3.5 | Keyboard navigation | Arrow keys (up/down) navigate between result rows. Selected result row highlighted, detail panel updates. Copy button copies field path to clipboard with toast notification. |
| REQ-3.6 | Highlight matching text | When searching by pattern, highlight the matched portion in the results display using visual emphasis. |
| REQ-3.7 | Truncation warning | Prominent warning banner when results exceed `MAX_RESULTS_PER_PAGE`, showing total count and guidance to refine search. |
| REQ-3.8 | Faceted metadata filtering | Left sidebar shows metadata keys present in results (NOT contextId). Header displays result count with tooltip explaining counts are based on loaded results (max 250). Active facets pinned to top with visual indicator. Clicking a key opens popover with mode toggle ("Include any" OR vs "Require one" AND) and value checkboxes/radios. Disjunctive counting: current facet counts stay constant while other facet counts update. Sidebar is collapsible. |

### REQ-4: XML Upload

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-4.1 | Step-based workflow | Three-step upload process: (1) Select Context, (2) Scan Files, (3) Review & Submit. Steps are visually indicated and navigable. |
| REQ-4.2 | Context selection | Before upload, user selects context from dropdown. **Only active contexts are shown.** Context selection loads extraction rules for smart metadata auto-extraction. |
| REQ-4.3 | File upload interface | Drag-and-drop zone accepting multiple XML files (up to 25). Also supports click-to-browse. |
| REQ-4.4 | Smart metadata extraction | Parse uploaded XML files and attempt to auto-extract metadata values based on context's extraction rules. Group files into "complete" (all required metadata extracted) and "incomplete" bins. |
| REQ-4.5 | Metadata editor modal | Modal for editing metadata values per file. Uses tag-based single-value inputs with autocomplete. Shows per-row completion status with visual highlighting. Save button always enabled; shows "Save Progress" when incomplete, glowing green "Save" when all required fields filled. |
| REQ-4.6 | Bin-based submission | Files grouped into bins by metadata combination. Each bin can be submitted independently. Shows field count, attribute count, and observation totals. |
| REQ-4.7 | Upload progress | Show submission status per bin. Display summary: X observations extracted from Y files. Toast notifications for success/error. |

#### XML Parsing Semantics (REQ-4.4 Detail)

**What constitutes "null" vs "empty":**
- **hasNull = true**: When `xsi:nil="true"` is explicitly present on an element
- **hasEmpty = true**: When an element contains only whitespace or is self-closing with no content

**Parsing rules:**
- Only **leaf elements** (elements with no child elements) are counted as fields
- Attributes are extracted as separate field paths (e.g., `/Root/@attr`)
- Namespaces are stripped (use `localName` only)
- Field paths are built hierarchically (e.g., `/Root/Parent/Child`)
- Count represents occurrences within a single document

### REQ-5: User Experience

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-5.1 | Search performance | Search results display within 2 seconds for typical queries |
| REQ-5.2 | Responsive design | UI usable on screens from 768px width and up. Two-column grid for contexts on medium+ screens. |
| REQ-5.3 | Error handling | Clear error banners for API failures. Loading indicators (skeleton loaders) during API calls. Empty state messaging when no results found. |
| REQ-5.4 | Toast notifications | Success/error feedback via toast notifications (bottom-right positioned, dark theme matching sidebar). |
| REQ-5.5 | Initial load performance | Application loads within 3 seconds. Bundle optimized via Vite. |

---

## Design Specifications

### Color Scheme

All colors are defined in `ui/src/index.css` `@theme` block (Tailwind v4 central palette):

| Purpose | Variable | Hex |
|---------|----------|-----|
| Background (light) | `--color-paper` | #F8FAFC |
| Primary text | `--color-ink` | #0F172A |
| Borders, dividers | `--color-steel` | #E2E8F0 |
| Dark backgrounds (sidebar) | `--color-charcoal` | #1E293B |
| Brand blue | `--color-ceremony` | #0052FF |
| Brand blue hover | `--color-ceremony-hover` | #0043CC |
| Success green | `--color-mint` | #22C55E |
| Success alt | `--color-success` | #10B981 |
| Error red | `--color-error-500` | #EF4444 |

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Headings | Inter | 18-24px | 800-900 (font-black) |
| Body Text | Inter | 14-16px | 400-500 |
| Code/XPath | Monaco, Consolas | 12-13px | 400 (monospace) |
| Labels | Inter | 10-12px | 700 (uppercase tracking) |

### Layout Principles

- Fixed header with navigation (Discovery, Field Search, Contexts, Upload)
- Main content area with optional left sidebar (facets) and right panel (details)
- Detail panels slide out from right
- Navy blue corporate-minimalist aesthetic
- Dark sidebar with light content area contrast
- Consistent header shadow with gradient transition

---

## UI Configuration

Configurable values defined in `ui/src/config.ts`:

| Setting | Default | Notes |
|---------|---------|-------|
| `MAX_RESULTS_PER_PAGE` | 250 | Maximum results displayed per search. Must align with backend `max-page-size` setting. |
| `DEBOUNCE_MS` | 500 | Delay before search input triggers API request. |
| `AUTOCOMPLETE_DEBOUNCE_MS` | 300 | Delay before autocomplete API requests fire. |
| `COPY_FEEDBACK_MS` | 2000 | Duration of copy confirmation feedback. |
| `DETAIL_PANEL_ANIMATION_MS` | 100 | Slide-out panel animation duration. |
| `API_BASE_URL` | (env var) | Backend API URL, configured via `VITE_API_BASE_URL`. |

---

## Technical Constraints

### Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

### Integration Requirements

- API Base URL configurable via environment variable
- CORS configured for Vite dev server (localhost:5173)
- React Query for server state management and caching
- Sonner for toast notifications
- Graceful error handling with ErrorBoundary

---

## Future Enhancements

These items are out of scope for initial release but inform architectural decisions:

- **Export functionality**: CSV/JSON export of search results with metadata
- **Column header filters**: Text/dropdown filters in table column headers
- **Tree view**: Hierarchical display of field paths
- **Field comparison**: Compare fields across contexts or metadata variants
- **Usage analytics**: Charts showing field usage patterns
- **Saved searches**: Bookmark and share search queries
- **Field path tooltips**: Hover to see full path for truncated values
