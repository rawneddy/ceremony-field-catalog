# Ceremony Field Catalog UI - Requirements & Design

## Project Overview

Build a React-based user interface for browsing and searching the Ceremony Field Catalog. The UI should provide an intuitive way for developers and analysts to explore XML field usage patterns across different business contexts.

## Core Concepts

The UI must support the **dynamic Context system**:
- **Contexts** are observation points created via API (not hardcoded)
- Each Context has its own **required** and **optional** metadata fields
- **CatalogEntries** are fields observed within a context
- Searches can filter by context, metadata fields, or field path patterns

## User Personas

### Primary Users

**1. Software Developers**
- Need to understand XML field usage in different contexts
- Want to find specific fields by XPath patterns
- Need to see field occurrence statistics for data validation
- Require efficient search and filtering capabilities

**2. Business Analysts**
- Need to understand field usage across business processes
- Want to compare field patterns between different products/documents
- Need to generate reports on field coverage and usage
- Require high-level overview and drill-down capabilities

**3. QA Engineers**
- Need to verify field implementations across environments
- Want to validate data quality attributes (null/empty allowances)
- Need to compare expected vs. actual field occurrences
- Require detailed field metadata for testing scenarios

## User Stories & Acceptance Criteria

### Epic 1: Context Management

**US1.0: View Available Contexts**
- **As a** user
- **I want to** see all available observation contexts
- **So that** I can understand what data is being captured
- **Acceptance Criteria:**
  - Display list of all contexts with display name and description
  - Show required and optional metadata fields for each context
  - Indicate active/inactive status
  - Allow selection of context for filtering searches

### Epic 2: Field Search & Discovery

**US2.1: Context-Based Field Search**
- **As a** developer
- **I want to** search for fields within a specific context
- **So that** I can understand field usage for that observation point
- **Acceptance Criteria:**
  - Context dropdown populated from API (GET /catalog/contexts)
  - Results display in paginated table format
  - Clear indication of total results count
  - Default to showing all contexts if none selected

**US2.2: Dynamic Metadata Filtering**
- **As a** developer
- **I want to** filter fields by any metadata field
- **So that** I can narrow down to specific business variants
- **Acceptance Criteria:**
  - Show metadata filters based on selected context's required/optional fields
  - Support filtering by any metadata key-value pair
  - Filters combine with AND logic
  - Clear all filters functionality
  - Filter state preserved during pagination

**US2.3: Field Path Pattern Search**
- **As a** developer
- **I want to** search for fields by XPath patterns
- **So that** I can find similar fields across different contexts
- **Acceptance Criteria:**
  - Search input supports partial fieldPath matching
  - Case-insensitive search
  - Highlight matching portions in results
  - Works with or without context filter

**US2.4: Cross-Context Search**
- **As an** analyst
- **I want to** search for fields across all contexts
- **So that** I can find all uses of a specific metadata value
- **Acceptance Criteria:**
  - Leave context filter empty to search all contexts
  - Display context name in results for context identification
  - Support metadata filters even without context selection

### Epic 3: Results Display & Navigation

**US3.1: Field Results Table**
- **As a** user
- **I want to** see field information in a clear, scannable format
- **So that** I can quickly understand field characteristics
- **Acceptance Criteria:**
  - Columns: Field Path, Context, Metadata, Min/Max Occurs, Allows Null/Empty
  - Sortable columns (fieldPath, contextId, minOccurs, maxOccurs)
  - Responsive design for different screen sizes
  - Row highlighting on hover
  - Alternating row colors for readability

**US3.2: Results Display & Navigation**
- **As a** user
- **I want to** see results with clear feedback when there are many matches
- **So that** I can refine my search if needed
- **Acceptance Criteria:**
  - Single-page results (max 250 entries)
  - Results count display ("Showing 250 of 1,247 results - refine your search")
  - Keyboard navigation support (arrow keys for row selection)
  - Client-side filtering to narrow displayed results

**US3.3: Field Detail View**
- **As a** user
- **I want to** see detailed information about a specific field
- **So that** I can understand its complete usage context
- **Acceptance Criteria:**
  - Click row to expand/show detail panel
  - Full field metadata display (all key-value pairs)
  - Occurrence statistics (minOccurs, maxOccurs)
  - Null/empty allowance flags
  - Copy fieldPath to clipboard functionality

**US3.4: Metadata Display**
- **As a** user
- **I want to** see metadata in a readable format
- **So that** I can understand the business context of each field
- **Acceptance Criteria:**
  - Display metadata as key-value pairs or badges
  - Handle variable number of metadata fields per entry
  - Show lowercase-normalized values clearly

### Epic 4: User Experience & Performance

**US4.1: Search Performance**
- **As a** user
- **I want** searches to complete quickly
- **So that** I can work efficiently without delays
- **Acceptance Criteria:**
  - Search results load within 2 seconds for typical queries
  - Loading indicators during API calls
  - Debounced search input (500ms delay)
  - Graceful handling of slow/failed requests
  - Offline indication when API unavailable

**US4.2: Responsive Design**
- **As a** user
- **I want** the interface to work on different devices
- **So that** I can access field data from any device
- **Acceptance Criteria:**
  - Mobile-responsive layout (breakpoints: 768px, 1024px)
  - Touch-friendly interface elements
  - Readable text and accessible color contrast
  - Horizontal scrolling for wide tables on mobile
  - Collapsible filter panels on smaller screens

**US4.3: Error Handling & User Feedback**
- **As a** user
- **I want** clear feedback when things go wrong
- **So that** I understand what happened and how to fix it
- **Acceptance Criteria:**
  - Clear error messages for API failures
  - Validation feedback for invalid search inputs
  - Retry mechanisms for failed requests
  - Empty state messaging when no results found
  - Success confirmations for actions taken

## UI Design Specifications

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Ceremony Field Catalog                              │
├─────────────────────────────────────────────────────────────┤
│ Context & Filter Panel                                      │
│ ┌─────────────┬─────────────┬─────────────┬─────────────┐   │
│ │ Context     │ Field Path  │ [Metadata   │ [Search]    │   │
│ │ [dropdown]  │ [text]      │  Filters]   │ [Clear]     │   │
│ └─────────────┴─────────────┴─────────────┴─────────────┘   │
│                                                             │
│ Dynamic Metadata Filters (based on selected context):       │
│ ┌─────────────┬─────────────┬─────────────┐                 │
│ │ productCode │ productSub  │ action      │ (deposits)      │
│ │ [text]      │ [text]      │ [text]      │                 │
│ └─────────────┴─────────────┴─────────────┘                 │
├─────────────────────────────────────────────────────────────┤
│ Results Summary: "Showing 1-50 of 1,247 results"            │
├─────────────────────────────────────────────────────────────┤
│ Results Table                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Field Path              │Context│ Metadata    │Occurs│N/E│ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ /Ceremony/Account/...   │deposit│ DDA/4S/Ful  │ 0-5  │Y/N│ │
│ │ /Document/Balance       │render │ STMT001     │ 1-1  │N/N│ │
│ │ [Expandable detail panels]                              │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Results Info: "Showing 250 of 1,247 - refine your search"   │
│ Client-side Filter: [Filter results...] [Clear Filters]     │
└─────────────────────────────────────────────────────────────┘
```

### Color Scheme & Styling

**Primary Colors:**
- Primary Blue: #2563eb (buttons, links, active states)
- Secondary Gray: #6b7280 (text, borders)
- Success Green: #10b981 (positive indicators)
- Warning Orange: #f59e0b (warnings)
- Error Red: #ef4444 (errors)

**Background Colors:**
- Main Background: #f9fafb
- Card/Panel Background: #ffffff
- Table Alternate Rows: #f3f4f6
- Hover States: #e5e7eb

### Typography
- **Headings:** Inter, 18px-24px, font-weight: 600
- **Body Text:** Inter, 14px-16px, font-weight: 400
- **Code/XPath:** Monaco/Consolas, 13px, monospace
- **Labels:** Inter, 12px-14px, font-weight: 500

### Component Specifications

#### Context Selector
- **Layout:** Dropdown populated from GET /catalog/contexts
- **Display:** contextId with displayName as label
- **Options:** "All Contexts" option for cross-context search
- **Behavior:** Selecting context updates available metadata filters

#### Dynamic Metadata Filters
- **Layout:** Grid of text inputs based on selected context
- **Fields:** Shows requiredMetadata + optionalMetadata from context
- **Behavior:** Empty when no context selected, shows all when searching cross-context

#### Search Form
- **Layout:** Horizontal form with context, field path, and metadata filters
- **Field Path Search:** Text input with search icon (maps to fieldPathContains)
- **Actions:** Primary "Search" button, secondary "Clear" button

#### Results Table
- **Columns:**
  1. Field Path (expandable, 35% width)
  2. Context (badge, 10% width)
  3. Metadata (condensed key=value, 25% width)
  4. Occurs (range display, 15% width)
  5. Null/Empty (icons, 15% width)
- **Sorting:** Click column headers, visual sort indicators
- **Row Actions:** Click to expand, hover effects

#### Metadata Display
- **Condensed:** Show as "key1=val1, key2=val2" in table
- **Expanded:** Show as vertical key-value list in detail panel
- **Note:** Values are lowercase-normalized from API

#### Detail Panel
- **Trigger:** Click table row or expand icon
- **Content:** Full field metadata in key-value format
- **Actions:** Copy fieldPath, close panel
- **Animation:** Smooth expand/collapse

#### Results & Filtering
- **Max Results:** 250 entries per search (single page)
- **Info:** "Showing X of Y results" with prompt to refine if truncated
- **Client-side Filter:** Text input to filter displayed results instantly
- **Keyboard:** Arrow keys for row navigation

## Technical Constraints

### Browser Support
- **Primary:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile:** iOS Safari 14+, Chrome Mobile 90+
- **Accessibility:** WCAG 2.1 AA compliance

### Performance Requirements
- **Initial Load:** < 3 seconds
- **Search Results:** < 2 seconds
- **Page Navigation:** < 1 second
- **Bundle Size:** < 500KB gzipped

### Integration Requirements
- **API Base URL:** Configurable via environment variables
- **Error Handling:** Graceful degradation for API failures
- **CORS:** Must work with Spring Boot CORS configuration
- **Authentication:** Ready for future auth integration

## Example API Interactions

### Loading Contexts
```typescript
// On app load, fetch available contexts
GET /catalog/contexts
// Populate context dropdown and determine available metadata filters
```

### Search Flow
```typescript
// User selects context "deposits"
// UI shows filters: productCode, productSubCode, action (required) + optional

// User enters: productCode=DDA, fieldPathContains=Account
GET /catalog/fields?contextId=deposits&productCode=DDA&fieldPathContains=Account&page=0&size=50

// Results show CatalogEntry objects with metadata, fieldPath, occurrence stats
```

### Cross-Context Search
```typescript
// User leaves context empty, searches for productCode=DDA across all contexts
GET /catalog/fields?productCode=DDA&page=0&size=50

// Results include entries from deposits, renderdata, or any context with productCode
```

## Future Enhancement Ideas

### Phase 2 Features
- Export results to CSV/Excel
- Save search queries/bookmarks
- Field usage analytics/charts
- Context management UI (create/edit contexts)
- Advanced regex fieldPath search

### Phase 3 Features
- Real-time field updates via WebSocket
- Field comparison tool (compare contexts or metadata variants)
- Usage trend analysis over time
- XSD/Schema generation from catalog data
- Integration with documentation systems
