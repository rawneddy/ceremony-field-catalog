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

### Metadata Normalization

The backend normalizes all metadata keys and values to **lowercase** for case-insensitive matching. The UI should:
- Display metadata values as stored (lowercase)
- Accept any case in filter inputs (will be normalized by API)
- Show autocomplete suggestions in lowercase (as stored)

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

### REQ-2: Field Search

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-2.1 | Context-based search | Dropdown to select context. When selected, search is scoped to that context only. |
| REQ-2.2 | Dynamic metadata filtering | When context is selected, show filter inputs for all required and optional metadata fields defined by that context. Filters combine with AND logic. |
| REQ-2.3 | Field path pattern search | Text input for case-insensitive contains matching on fieldPath. Works with or without context selection. |
| REQ-2.4 | Cross-context search | When no context selected, search across all contexts. Results show context column for identification. |
| REQ-2.5 | Field path autocomplete | When user types a path starting with `/`, show autocomplete suggestions. Suggestions scoped to selected context and metadata filters if present. |
| REQ-2.6 | Metadata value autocomplete | Metadata filter inputs show autocomplete suggestions based on existing values in the catalog, scoped to selected context. |

### REQ-3: Results Display

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-3.1 | Results table | Display results in table with columns: fieldPath, context (when cross-context), metadata values (when context selected), minOccurs, maxOccurs, allowsNull, allowsEmpty. All columns sortable. |
| REQ-3.2 | Single-page results | Display max 250 results per search. If more exist, show message: "Showing 250 of X results - refine your search for more specific results." |
| REQ-3.3 | Client-side filtering | After results load, provide instant client-side filters: text filter on path, text filter on metadata, checkboxes for has-null, has-empty, optional (min=0), repeating (max>1). |
| REQ-3.4 | Field detail panel | Clicking a row opens slide-out panel showing: full fieldPath with copy button, context, all metadata key-value pairs, occurrence range, null/empty flags. |
| REQ-3.5 | Keyboard navigation | Arrow keys (up/down) navigate between result rows. Selected row highlighted, detail panel updates. |
| REQ-3.6 | Export results | Export current results to CSV or JSON format. Option to export all results or only client-side filtered results. |
| REQ-3.7 | Highlight matching text | When searching by fieldPath pattern, highlight the matched portion in the results display. |

### REQ-4: XML Upload

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-4.1 | File upload interface | Drag-and-drop zone accepting multiple XML files. Also supports click-to-browse. |
| REQ-4.2 | XML parsing | Parse uploaded XML files to extract field observations. Logic matches existing SDK implementations (strip namespaces, extract leaf elements and attributes, track count/null/empty). See "XML Parsing Semantics" below. |
| REQ-4.3 | Metadata input | Before upload, user selects context and provides required metadata values. Inputs have autocomplete. Show warning if context is inactive. |
| REQ-4.4 | Upload progress | Show progress indicator per file. Display final summary: X observations extracted from Y files, submission status. |

#### XML Parsing Semantics (REQ-4.2 Detail)

The UI XML parser must match the behavior of the existing SDKs:

**What constitutes "null" vs "empty":**
- **hasNull = false**: XML does not have a concept of "null" in standard parsing. The `hasNull` flag is effectively always `false` for XML sources unless `xsi:nil="true"` is explicitly present on an element.
- **hasEmpty = true**: When an element contains only whitespace or is self-closing with no content (e.g., `<Amount/>` or `<Amount>   </Amount>`).

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
