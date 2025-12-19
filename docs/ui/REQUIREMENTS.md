# Ceremony Field Catalog UI - Requirements

## Document Purpose

This document defines the functional and non-functional requirements for the Ceremony Field Catalog UI. It serves as the source of truth for requirements traceability. Implementation details are in `IMPLEMENTATION.md`.

---

## Project Overview

Build a web-based user interface for browsing, searching, and managing the Ceremony Field Catalog. The UI enables developers and analysts to explore XML field usage patterns across different business contexts, manage context definitions, and upload XML files for field observation.

---

## Core Concepts

The UI must support the **dynamic Context system**:

- **Contexts** are observation points created via API (not hardcoded)
- Each Context has its own **required** and **optional** metadata fields
- **CatalogEntries** are fields observed within a context
- Field identity is determined by: `contextId + requiredMetadata + fieldPath`
- Searches can filter by context, metadata fields, or field path patterns

### Data Normalization

The backend normalizes data to **lowercase** for case-insensitive matching:

**Metadata normalization:**
- All metadata keys and values are stored as lowercase
- UI should display metadata values as stored (lowercase)
- UI can accept any case in filter inputs (normalized by API)
- Autocomplete suggestions appear in lowercase (as stored)

**Field path normalization:**
- All `fieldPath` values are stored as lowercase (e.g., `/ceremony/account/amount`)
- UI should display field paths as stored (lowercase)
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
| REQ-1.1 | View all contexts | Display list of all contexts showing: displayName, description, required/optional metadata fields, active/inactive status, field count |
| REQ-1.2 | Create new context | Form to create context with: contextId, displayName, description, required metadata array, optional metadata array, active flag. Validation per API spec. |
| REQ-1.3 | Edit existing context | Edit form allowing changes to: displayName, description, optional metadata, active flag. Required metadata is read-only after creation. |
| REQ-1.4 | Delete context | Confirmation dialog showing context name and field count that will be deleted. Requires explicit confirmation. |
| REQ-1.5 | Visual distinction for inactive contexts | Inactive contexts displayed with muted/greyed styling to indicate they are not accepting observations |

**Note on inactive contexts:** The backend API automatically filters out fields from inactive contexts in all search and autocomplete responses. The UI only needs to hide inactive contexts from dropdowns (REQ-2.5, REQ-4.3) - no client-side result filtering is required.

### REQ-2: Field Search (Two-View Model)

The UI provides two distinct search views optimized for different use cases:

#### Quick Search View (Home Page)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-2.1 | Global search input | Single search box with placeholder "Search fields or contexts...". In **String mode**: searches fieldPath, contextId, and metadata values using OR logic; when input starts with `/`, activates fieldPath-only mode with autocomplete and shows hint text. In **Regex mode**: searches all values (fieldPath, contextId, metadata) with regex pattern, no autocomplete, no special `/` handling. Includes string/regex toggle (see REQ-2.11). |
| REQ-2.2 | Single query parameter | Uses `?q=` parameter for global search. Example: `/catalog/fields?q=Amount` matches fields where fieldPath OR contextId contains "Amount". |
| REQ-2.3 | Cross-context results | Results always show context column (contextId). No metadata columns since they vary by context. |
| REQ-2.4 | Link to Advanced Search | Prominent link/button to switch to Advanced Search view for more precise filtering (including metadata). |

#### Advanced Search View

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-2.5 | Context selector | Single-select dropdown to filter by context. **Only active contexts are shown** (inactive contexts are managed exclusively in Context Management). When no context is selected, search returns results from all active contexts. |
| REQ-2.6 | Dynamic metadata filtering | When a context is selected, show filter inputs for all required and optional metadata fields defined by that context. Filters combine with AND logic. When no context selected, metadata filters are hidden. |
| REQ-2.7 | Field path pattern filter | Text input for fieldPath matching. Includes string/regex toggle (see REQ-2.11). Works with or without context selection. |
| REQ-2.8 | Scoped fieldPath autocomplete | In **string mode only**: when user types a path starting with `/`, show autocomplete suggestions. Suggestions scoped to selected context and metadata filters if present. Autocomplete is disabled in regex mode. |
| REQ-2.9 | Metadata value autocomplete | Metadata filter inputs show autocomplete suggestions based on existing values, scoped to selected context. |
| REQ-2.10 | AND filter logic | All filters combine with AND logic. Example: `contextId=deposits AND productCode=DDA AND fieldPathContains=/Account` |
| REQ-2.11 | String/Regex toggle | Field path inputs (Quick Search and Advanced Search fieldPath) include a toggle between **String** (default) and **Regex** modes. In String mode: input is treated as literal text, special characters are auto-escaped, autocomplete is enabled. In Regex mode: input is treated as regex pattern, no autocomplete. Toggle only appears on field path inputs, not on context or metadata filters. |

### REQ-3: Results Display

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-3.1 | Results table | Display results in table with fixed columns: fieldPath, context, minOccurs, maxOccurs, allowsNull, allowsEmpty. All columns sortable. Column header filters: Field Path (text input), Context (dropdown with distinct values from results), Null?/Empty? (dropdown: All/Yes/No). **No metadata columns** - metadata is shown in detail panel only (scales to any number of contexts). |
| REQ-3.2 | Single-page results | Display up to `MAX_RESULTS_PER_PAGE` results per search (see UI Configuration). If more exist, show a prominent warning banner (not subtle text) indicating results are truncated and the user should refine their search. Example: "Showing 250 of X results - please refine your search to see all matches." |
| REQ-3.3 | Client-side filtering | Left sidebar provides instant client-side faceted metadata filtering (REQ-3.8). Table column headers provide filters for Field Path, Context, Null?, and Empty? (REQ-3.1). All filters apply instantly without API calls. |
| REQ-3.4 | Field detail panel | Clicking a row opens slide-out panel showing: context, **all metadata key-value pairs**, occurrence range, null/empty flags. Field path is already visible in the selected table row. Panel slides from right with `DETAIL_PANEL_ANIMATION_MS` timing (see UI Configuration). |
| REQ-3.5 | Keyboard navigation | Arrow keys (up/down) navigate between result rows and autocomplete suggestions. Enter selects the highlighted autocomplete suggestion. Selected result row highlighted, detail panel updates. |
| REQ-3.6 | Export results | Export currently loaded results to CSV or JSON format (toggle styled like String/Regex toggle). Column order: contextId, fieldPath, metadata keys (alphabetical), minOccurs, maxOccurs, allowsNull, allowsEmpty. Export button shows count: "Export (X of Y)" when filters active, "Export (X)" when not. Exports filtered subset only when filters are active. Export is client-side only. |
| REQ-3.7 | Highlight matching text | When searching by fieldPath pattern, highlight the matched portion in the results display. |
| REQ-3.8 | Faceted metadata filtering | Left sidebar shows metadata keys present in results (NOT contextId - that's a column header filter). Header displays "Filtering X loaded results" with tooltip explaining counts are based on loaded results (max 250), not global database. Facet values sorted alphabetically. Active facets pinned to top; add "Search facets..." input if > 10 keys. Clicking a key opens popover (min-width: 220px, max-width: 350px, max-height: 300px with scroll). Popover contains: (1) Match mode toggle - "Include any" (OR, checkboxes) or "Require one" (AND, radio buttons); switching modes with multiple values shows warning before clearing, (2) List of values with "Search values..." input if many, (3) [Clear] button (clears only this facet). Disjunctive counting: current facet counts stay constant while other facet counts update. When filters narrow results to zero, keep filters visible so user can undo. Manual collapse toggle for sidebar. Multiple key filters combine with AND logic. |

### REQ-4: XML Upload

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-4.1 | File upload interface | Drag-and-drop zone accepting multiple XML files. Also supports click-to-browse. |
| REQ-4.2 | XML parsing | Parse uploaded XML files to extract field observations. Logic matches existing SDK implementations (strip namespaces, extract leaf elements and attributes, track count/null/empty). See "XML Parsing Semantics" below. |
| REQ-4.3 | Metadata input | Before upload, user selects context and provides required metadata values. **Only active contexts are shown** in the dropdown (inactive contexts cannot receive observations). Inputs have autocomplete. |
| REQ-4.4 | Upload progress | Show progress indicator per file. Display final summary: X observations extracted from Y files, submission status. |

#### XML Parsing Semantics (REQ-4.2 Detail)

**What constitutes "null" vs "empty":**
- **hasNull = true**: When `xsi:nil="true"` is explicitly present on an element. This indicates the element is explicitly null.
- **hasEmpty = true**: When an element contains only whitespace or is self-closing with no content (e.g., `<Amount/>`, `<Amount></Amount>`, or `<Amount>   </Amount>`).

**Note:** A `hasNull` observation also implies `minOccurs = 0` for the field, since a null value indicates the field may be absent/optional.

**Note:** The existing Python and C# SDKs do not currently implement `xsi:nil` detection (this is a known bug). The UI parser should implement correct behavior.

**Parsing rules:**
- Only **leaf elements** (elements with no child elements) are counted as fields
- Attributes are extracted as separate field paths (e.g., `/Root/@attr`)
- Namespaces are stripped (use `localName` only)
- Field paths are built hierarchically (e.g., `/Root/Parent/Child`)
- Count represents occurrences within a single document
- Check for `xsi:nil="true"` attribute to set `hasNull`

### REQ-5: User Experience

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-5.1 | Search performance | Search results display within 2 seconds for typical queries |
| REQ-5.2 | Responsive design | UI usable on screens from 768px width and up. Tables scroll horizontally on smaller screens. |
| REQ-5.3 | Error handling | Clear error messages for API failures. Loading indicators during API calls. Empty state messaging when no results found. |
| REQ-5.4 | ~~Accessibility~~ | *Removed - not a priority for initial release* |
| REQ-5.5 | Initial load performance | Application loads within 3 seconds. See "Performance Testing" below. |

#### Performance Testing (REQ-5.5 Detail)

**Verification approach:**
- Bundle size measured via `vite build` output
- Lighthouse performance audit targeting score > 90
- Initial load measured on throttled 3G connection in DevTools

**Bundle size budget:**
- Total JavaScript: < 500KB gzipped
- Main chunk: < 200KB gzipped
- Lazy-loaded routes allowed for large components

---

## Design Specifications

### Color Scheme

| Purpose | Color | Hex |
|---------|-------|-----|
| Primary Blue | Buttons, links, active states | #2563eb |
| Secondary Gray | Text, borders | #6b7280 |
| Success Green | Positive indicators | #10b981 |
| Warning Orange | Warnings | #f59e0b |
| Error Red | Errors | #ef4444 |
| Main Background | Page background | #f9fafb |
| Card Background | Panels, cards | #ffffff |
| Table Alternate | Alternating rows | #f3f4f6 |
| Hover State | Interactive hover | #e5e7eb |

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Headings | Inter | 18-24px | 600 |
| Body Text | Inter | 14-16px | 400 |
| Code/XPath | Monaco, Consolas | 13px | 400 (monospace) |
| Labels | Inter | 12-14px | 500 |

### Layout Principles

- Header with navigation (Search, Contexts, Upload)
- Main content area with filters above results
- Detail panels slide out from right
- Consistent spacing and alignment
- Navy blue corporate-minimalist aesthetic

---

## UI Configuration

Configurable values for the UI. These should be defined in a single location (e.g., `config.ts`) and referenced throughout the application.

| Setting | Default | Notes |
|---------|---------|-------|
| `MAX_RESULTS_PER_PAGE` | 250 | Maximum results displayed per search. Must align with backend `max-page-size` setting (see `application.yml`). When exceeded, truncation warning is shown. |
| `AUTOCOMPLETE_DEBOUNCE_MS` | 300 | Delay before autocomplete API requests fire. Balances responsiveness with API efficiency. |
| `DETAIL_PANEL_ANIMATION_MS` | 100 | Slide-out panel animation duration. Keep fast for responsive feel. |
| `API_BASE_URL` | (env var) | Backend API URL, configured via environment variable. |

**Backend alignment note:** The `MAX_RESULTS_PER_PAGE` value must match the backend's `app.catalog.search.max-page-size` setting. Both are currently set to 250.

---

## Technical Constraints

### Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |
| iOS Safari | 14+ |
| Chrome Mobile | 90+ |

### Integration Requirements

- API Base URL configurable via environment variable
- Must work with Spring Boot CORS configuration
- Graceful degradation when API unavailable
- Architecture ready for future authentication integration

---

## Future Enhancements

These items are out of scope for initial release but inform architectural decisions:

- **Tree view**: Hierarchical display of field paths
- **Field comparison**: Compare fields across contexts or metadata variants
- **Usage analytics**: Charts showing field usage patterns
- **Real-time updates**: WebSocket-based live field observation
- **XSD generation**: Generate XML schemas from catalog data
- **Advanced search**: Regex patterns, multiple field path filters
- **Saved searches**: Bookmark and share search queries
