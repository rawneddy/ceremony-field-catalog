# How To: Search & Filtering

**Purpose:** Understand and modify search/suggest behavior across API and UI
**Use when:** Changing search logic, filters, autocomplete, or discovery behavior
**Don't use when:** Changing context lifecycle → see `contexts.md`
**Source of truth:**
- `CatalogSearchCriteria.java` - search parameter definitions
- `DynamicSearchParameterResolver.java` - query param parsing
- `CatalogCustomRepositoryImpl.java` - MongoDB query building
- `ui/src/pages/DiscoverFieldsPage.tsx` - discovery UI
- `ui/src/pages/ExploreSchemaPage.tsx` - schema search UI

---

## Search Modes

### Discovery Search (`q` parameter)

Global search across multiple fields using OR logic:

```http
GET /catalog/fields?q=amount
```

Searches:
- `fieldPath` (contains)
- `contextId` (contains)
- All metadata values (via `$objectToArray`)

**Code path:** `CatalogCustomRepositoryImpl.buildDynamicQuery()` → `buildDiscoveryQuery()`

### Filter Search (Scoped)

Targeted search using specific parameters:

```http
GET /catalog/fields?contextId=deposits&fieldPathContains=Account&metadata.productCode=DDA
```

| Parameter | Behavior |
|-----------|----------|
| `contextId` | Exact match (case-insensitive, normalized to lowercase) |
| `fieldPathContains` | Contains match on `fieldPath` |
| `useRegex=true` | Treat `fieldPathContains` as regex pattern |
| `metadata.<key>=<value>` | Match on required OR optional metadata |

**Multi-value metadata:** `metadata.productCode=DDA&metadata.productCode=SAV` → OR within field, AND between fields.

**Metadata matching behavior:**
- For **required metadata**: exact match on single value
- For **optional metadata**: match if ANY accumulated value in the set matches (array containment)

Since optional metadata accumulates all observed values over time, filtering by `metadata.channel=web` will match any field that was *ever* observed with `channel=web`, even if it was also observed with other channel values.

---

## API Endpoints

### Field Search
```http
GET /catalog/fields?contextId=deposits&page=0&size=20
```

### Suggest/Autocomplete
```http
GET /catalog/suggest?field=fieldPath&prefix=/Document&contextId=deposits
```

Suggest fields: `fieldPath`, `contextId`, or any `metadata.<key>`

---

## UI Implementation

### Discover Fields Page (`/`)

The Discovery page has two distinct filtering mechanisms:

#### Server-Side Filtering (Header Bar)
These controls trigger API calls and fetch new data from the backend:

- **Search box:** Global search across fieldPath, contextId, and all metadata values (debounced)
- **Context selector:** Filters to a specific context
- **Metadata filter chips:** Multi-value tag inputs that scope the API query

When you change these, the API returns a fresh set of up to 250 results matching your criteria.

#### Client-Side Filtering (Facet Sidebar)
The left-hand facet sidebar does **client-side filtering only** - no API calls:

- **Facet values:** Click to filter the already-loaded results
- **Counts:** Show how many of the loaded results have each value (stable, based on unfiltered results)

Each facet supports two modes (toggle via the mode icon):

| Mode | Behavior | Selection |
|------|----------|-----------|
| **Include Any** (default) | OR logic - field matches if it has ANY of the selected values | Multi-select |
| **Require All** | AND logic - field must have variants covering ALL selected values | Multi-select |

With "Include Any" mode, adding more values can *increase* results (broadening the filter). With "Require All" mode, adding values will *reduce* results (narrowing the filter).

This Splunk-style approach allows fast drill-down into loaded results without round-trips to the server.

**Important:** Facet counts are based on loaded results (max 250), not the global database. The info icon tooltip indicates this.

**Key files:**
- `DiscoverFieldsPage.tsx` - page component with both filter types
- `useFieldSearch.ts` - search hook (server-side)
- `useDiscoveryFacets.ts` - facet computation (client-side)
- `FacetSidebar.tsx` - facet display
- `MetadataFilters.tsx` - header filter chips

#### Variant Explorer Panel

Clicking a field in the table opens the Variant Explorer panel on the right. This shows all **schema variants** (unique context + required metadata combinations) where the field path appears.

For each variant you can see:
- Schema key (context + required metadata values)
- Optional metadata (hover the tag icon to see accumulated values)
- Min/max occurs, null/empty behavior
- Link to view that variant in Schema Search

The panel respects current facet filters - variants hidden by filters appear dimmed. Toggle "Show all variants" to reveal them.

#### Cascading Metadata Filters

The metadata filter inputs (TagInput components) support **cascading suggestions**. When you select a value for one metadata field, suggestions for other fields are constrained to values that exist together with your selection.

Example:
1. Select `ProductCode = DDA`
2. Click into `SubProductCode` - suggestions now only show subproduct codes that were observed with `ProductCode=DDA`

This helps users discover valid combinations instead of seeing all possible values.

### Explore Schema Page (`/schema`)

- **Explicit search:** User clicks "Search" button
- **Required metadata:** Single-value inputs (part of field identity)
- **Optional metadata:** Multi-value tag inputs
- **Field filter:** Client-side filtering of results

#### Return Navigation from Discovery

When navigating from Discovery → Schema via the Variant Explorer panel's external link, the Schema page shows a return banner. Clicking "Return to Discovery" restores:
- The original context and metadata filters
- Facet filter selections and modes
- Search query
- The selected field path (re-opens in Variant Explorer)

This enables a drill-down workflow: explore a field's variants in Discovery, jump to Schema to see full details of a specific variant, then return to continue exploration.

**Key files:**
- `ExploreSchemaPage.tsx` - page component
- `DiscoveryReturnBanner.tsx` - return navigation banner
- `InlineRequiredMetadata.tsx` - required inputs
- `InlineOptionalMetadata.tsx` - optional inputs
- `SchemaExportButtons.tsx` - XSD/JSON export

---

## Modifying Search Behavior

### Add New Search Parameter

1. Add field to `CatalogSearchCriteria.java`
2. Handle in `DynamicSearchParameterResolver.java`
3. Add to query in `CatalogCustomRepositoryImpl.buildDynamicQuery()`
4. Update API spec if public

### Change Metadata Query Logic

Edit `CatalogCustomRepositoryImpl.addMetadataFilters()`:
- Current: OR within field, AND between fields
- Multi-value: Creates `$in` query for each field

### Add New Suggest Field

Edit `CatalogController.suggest()` and `CatalogCustomRepository.suggest()`

---

## Common Patterns

### Case Normalization
All metadata keys and values are normalized to lowercase before storage and query.

### Active Context Filtering
By default, only fields from active contexts are returned. Override with `includeInactive=true`.

### Regex Search
When `useRegex=true`:
- `fieldPathContains` is treated as regex pattern
- UI shows toggle between String/Regex modes
- Backend uses MongoDB `$regex` operator
