# Ceremony Field Catalog UI - Requirements & Design

## Project Overview

Build a React-based user interface for browsing and searching the Ceremony Field Catalog. The UI should provide an intuitive way for developers and analysts to explore XML field usage patterns across different business processes.

## User Personas

### Primary Users

**1. Software Developers**
- Need to understand XML field usage in different business contexts
- Want to find specific fields by XPath patterns
- Need to see field occurrence statistics for data validation
- Require efficient search and filtering capabilities

**2. Business Analysts**  
- Need to understand field usage across business processes
- Want to compare field patterns between different products/forms
- Need to generate reports on field coverage and usage
- Require high-level overview and drill-down capabilities

**3. QA Engineers**
- Need to verify field implementations across environments
- Want to validate data quality attributes (null/empty allowances)
- Need to compare expected vs. actual field occurrences
- Require detailed field metadata for testing scenarios

## User Stories & Acceptance Criteria

### Epic 1: Field Search & Discovery

**US1.1: Basic Field Search**
- **As a** developer
- **I want to** search for fields by business path type
- **So that** I can understand field usage in specific contexts
- **Acceptance Criteria:**
  - Search form with path type dropdown (deposits, loans, ondemand)
  - Results display in paginated table format
  - Clear indication of total results count
  - Default to showing all path types if none selected

**US1.2: Advanced Filtering**
- **As a** developer  
- **I want to** filter fields by multiple criteria simultaneously
- **So that** I can narrow down to specific field sets
- **Acceptance Criteria:**
  - Filters for: formCode, productCode, action, loanProductCode
  - XPath pattern search (contains/regex)
  - Filters combine with AND logic
  - Clear all filters functionality
  - Filter state preserved during pagination

**US1.3: XPath Pattern Search**
- **As a** developer
- **I want to** search for fields by XPath patterns
- **So that** I can find similar fields across different contexts
- **Acceptance Criteria:**
  - Search input supports partial xpath matching
  - Case-insensitive search
  - Highlight matching portions in results
  - Search suggestions based on existing xpaths
  - Regular expression support (advanced mode)

### Epic 2: Results Display & Navigation

**US2.1: Field Results Table**
- **As a** user
- **I want to** see field information in a clear, scannable format
- **So that** I can quickly understand field characteristics
- **Acceptance Criteria:**
  - Columns: XPath, Path Type, Context, Min/Max Occurs, Allows Null/Empty
  - Sortable columns (xpath, pathType, minOccurs, maxOccurs)
  - Responsive design for different screen sizes
  - Row highlighting on hover
  - Alternating row colors for readability

**US2.2: Pagination & Navigation**
- **As a** user
- **I want to** navigate through large result sets efficiently
- **So that** I can explore all available data
- **Acceptance Criteria:**
  - Page size selector (25, 50, 100, 200)
  - First/Previous/Next/Last navigation
  - Jump to specific page input
  - Results count display ("Showing 1-50 of 1,247 results")
  - Keyboard navigation support (arrow keys, enter)

**US2.3: Field Detail View**
- **As a** user
- **I want to** see detailed information about a specific field
- **So that** I can understand its complete usage context
- **Acceptance Criteria:**
  - Click row to expand/show detail panel
  - Full field metadata display
  - Business context explanation
  - Occurrence statistics visualization
  - Copy xpath to clipboard functionality

### Epic 3: User Experience & Performance

**US3.1: Search Performance**
- **As a** user
- **I want** searches to complete quickly
- **So that** I can work efficiently without delays
- **Acceptance Criteria:**
  - Search results load within 2 seconds for typical queries
  - Loading indicators during API calls
  - Debounced search input (500ms delay)
  - Graceful handling of slow/failed requests
  - Offline indication when API unavailable

**US3.2: Responsive Design**
- **As a** user
- **I want** the interface to work on different devices
- **So that** I can access field data from any device
- **Acceptance Criteria:**
  - Mobile-responsive layout (breakpoints: 768px, 1024px)
  - Touch-friendly interface elements
  - Readable text and accessible color contrast
  - Horizontal scrolling for wide tables on mobile
  - Collapsible filter panels on smaller screens

**US3.3: Error Handling & User Feedback**
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
│ Header: Ceremony Field Catalog                             │
├─────────────────────────────────────────────────────────────┤
│ Search & Filter Panel                                      │
│ ┌─────────────┬─────────────┬─────────────┬─────────────┐   │
│ │ Path Type   │ XPath       │ Context     │ [Search]    │   │
│ │ [dropdown]  │ [text]      │ [various]   │ [Clear]     │   │
│ └─────────────┴─────────────┴─────────────┴─────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ Results Summary: "Showing 1-50 of 1,247 results"          │
├─────────────────────────────────────────────────────────────┤
│ Results Table                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ XPath                   │ Type │ Context │ Occurs │ Null│ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ /Ceremony/Account/...   │ dep  │ Ful/DDA │ 0-5    │ Y/N │ │
│ │ /BMIC/Application/...   │ loan │ HEQF    │ 1-1    │ N/N │ │
│ │ [Expandable detail panels]                              │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Pagination: [First] [Prev] 1 2 3 ... [Next] [Last]        │
│ Page Size: [25▼] Records per page                          │
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

#### Search Form
- **Layout:** Horizontal form with grouped fields
- **Path Type:** Dropdown with "All", "Deposits", "Loans", "OnDemand"
- **XPath Search:** Text input with search icon
- **Context Filters:** Dynamic based on selected path type
- **Actions:** Primary "Search" button, secondary "Clear" button

#### Results Table
- **Columns:**
  1. XPath (expandable, 40% width)
  2. Path Type (badge, 15% width)  
  3. Business Context (text, 20% width)
  4. Occurs (range display, 15% width)
  5. Null/Empty (icons, 10% width)
- **Sorting:** Click column headers, visual sort indicators
- **Row Actions:** Click to expand, hover effects

#### Detail Panel
- **Trigger:** Click table row or expand icon
- **Content:** Full field metadata in key-value format
- **Actions:** Copy XPath, close panel
- **Animation:** Smooth expand/collapse

#### Pagination
- **Controls:** First, Previous, Page Numbers, Next, Last
- **Page Size:** Dropdown selector
- **Info:** "Showing X-Y of Z results"
- **Keyboard:** Arrow keys for navigation

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

## Future Enhancement Ideas

### Phase 2 Features
- Export results to CSV/Excel
- Save search queries/bookmarks
- Field usage analytics/charts
- Bulk field operations
- Advanced regex xpath builder

### Phase 3 Features
- Real-time field updates
- Field comparison tool
- Usage trend analysis
- Integration with documentation systems
- API for embedding in other tools